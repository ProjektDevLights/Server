import { ConflictException, Injectable } from "@nestjs/common";
import { forIn, intersection, isEqual, map } from "lodash";
import moment from "moment";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../exceptions/nothing-changed.exception";
import { Alarm, Light, StandartResponse, Time } from "../../interfaces";
import { AlarmDocument } from "../../schemas/alarm.schema";
import { CronService } from "../../services/cron/cron.service";
import { TcpService } from "../../services/tcp/tcp.service";
import { UtilsService } from "../../services/utils/utils.service";
import { AlarmDto } from "./dto/alarm.dto";
import { EditAlarmsDto } from "./dto/edit-alarm.dto";

export type Conflict = { alarm: string; esps: string[] };
@Injectable()
export class AlarmService {
  constructor(
    private databaseServiceAlarm: DatabaseAlarmService,
    private databaseServiceEsp: DatabaseEspService,
    private tcpService: TcpService,
    private utilsService: UtilsService,
    private cronService: CronService,
  ) {}

  private runningAlarms: {
    id: string;
    interval: NodeJS.Timeout;
  }[] = [];

  private callback = async (name: string) => {
    let alarm: AlarmDocument = await this.databaseServiceAlarm.getAlarmWithId(
      name.split("-")[1],
    );

    alarm.esps.forEach(async esp => {
      const oldLight: Light = DatabaseEspService.espDocToLight(
        await this.databaseServiceEsp.getEspWithId(
          //@ts-ignore
          esp.uuid,
        ),
      );

      const newDoc = await this.databaseServiceEsp.updateEspWithId(
        oldLight.id,
        {
          leds: {
            colors: ["#000000"],
            pattern: "waking",
          },
          brightness: 255,
          isOn: true,
        },
      );
      this.tcpService.sendData(
        `{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
          ["#000000"],
        )}, "pattern": "plain"}}`,
        newDoc.ip,
      );
      this.tcpService.sendData(`{ "command": "on" }`, newDoc.ip);
      this.tcpService.sendData(
        `{"command": "brightness", "data": 255 }`,
        newDoc.ip,
      );

      this.utilsService.fading(
        newDoc.id,
        {
          color: alarm.color,
          time: 5000 * 60,
          delay: (5000 * 60) / 255,
        },
        newDoc,
      );
    });
  };

  private getConflictingAlarms(
    time: Time,
    esps: string[], // uuids
    alarms: AlarmDocument[],
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // 7:59 8:00
    alarms.forEach(alarm => {
      if (alarm.isOn) {
        if (
          Math.round(
            Math.abs(
              moment(alarm.time, "HH:MM").unix() * 60 -
                moment(time, "HH:MM").unix() * 60,
            ),
          ) < 5
        ) {
          conflicts.push({
            alarm: alarm.id,
            esps: intersection(esps, map(alarm.esps, "uuid")),
          });
        }
      }
    });
    return conflicts;
  }

  async scheduleAlarm(data: AlarmDto): Promise<StandartResponse<Alarm>> {
    const allAlarms: AlarmDocument[] = await this.databaseServiceAlarm.getAlarms();

    const conflicts: Conflict[] = this.getConflictingAlarms(
      data.time,
      data.ids,
      allAlarms,
    );
    if (conflicts.length > 0) {
      throw new ConflictException({
        statusCode: 419,
        message:
          "The alarm is conflicting with existing alarms! Consider turning them off or changing the light in them.",
        error: "Conflict",
      });
    }

    const splitTime: string[] = data.time.split(":");
    const daysString: string = data.days.length
      ? data.days.join(",")
      : "0,1,2,3,4,5,6";
    const cronPattern = `${splitTime[1]} ${splitTime[0]} * * ${daysString}`;

    const espIds: string[] = await this.databaseServiceEsp
      .getEspsWithMultipleIds(data.ids, true)
      .distinct("_id")
      .exec();
    const alarmId: string = (
      await this.databaseServiceAlarm.addAlarm({
        time: data.time,
        color: data.color,
        cronPattern: cronPattern,
        days: daysString.split(",").map(x => +x),
        esps: espIds,
        isOn: true,
        name: data.name,
      })
    )._id;

    this.cronService.addCron(`alarm-${alarmId}`, cronPattern, this.callback);

    return {
      message: "Succesfully scheduled alarm!",
      object: DatabaseAlarmService.alarmDocToAlarm(
        await this.databaseServiceAlarm.getAlarmWithId(alarmId),
      ),
    };
  }

  private checkEquality(
    request: EditAlarmsDto,
    database: EditAlarmsDto,
  ): boolean {
    console.log(database);
    let equal: boolean = true;
    forIn(request, (data: unknown, key: string) => {
      console.log(data && !isEqual(data, database[key]));
      if (data && !isEqual(data, database[key])) {
        equal = false;
      }
    });
    return equal;
  }

  async editAlarmWithId(
    id: string,
    data: EditAlarmsDto,
  ): Promise<StandartResponse<Alarm>> {
    const alarmDoc = await this.databaseServiceAlarm.getAlarmWithId(id);

    if (
      this.checkEquality(data, {
        color: alarmDoc.color,
        days: alarmDoc.days,
        ids: map(alarmDoc.esps, "uuid"),
        name: alarmDoc.name,
        time: alarmDoc.time,
      })
    ) {
      throw new NothingChangedException();
    }

    let cronPattern: string = undefined;

    if (data.isOn === false) {
      this.cronService.deleteCron(`alarm-${alarmDoc.id}`);
      console.log("off");
    }
    if (
      ((data.time && data.time != alarmDoc.time) ||
        (data.days && data.days != alarmDoc.days)) &&
      (data.isOn === true || (data.isOn !== false && alarmDoc.isOn))
    ) {
      console.log("datum change");

      const splitTime: string[] = data.time.split(":");
      const daysString: string = data.days
        ? data.days.join(",")
        : "0,1,2,3,4,5,6";
      cronPattern = `${splitTime[1]} ${splitTime[0]} * * ${daysString}`;
      this.cronService.deleteCron(`alarm-${alarmDoc.id}`);

      this.cronService.addCron(
        `alarm-${alarmDoc.id}`,
        cronPattern,
        this.callback,
      );
    }

    const espIds: string[] = data.ids
      ? await this.databaseServiceEsp
          .getEspsWithMultipleIds(data.ids, true)
          .distinct("_id")
          .exec()
      : map(alarmDoc.esps, "_id");
    const newDocId: string = (
      await this.databaseServiceAlarm.updateAlarm(id, {
        esps: espIds,
        name: data.name ?? alarmDoc.name,
        time: data.time ?? alarmDoc.time,
        isOn: data.isOn ?? alarmDoc.isOn,
        days: data.days ?? alarmDoc.days,
        color: data.color ?? alarmDoc.color,
        cronPattern: cronPattern ?? alarmDoc.cronPattern,
      })
    ).id;

    return {
      message: "Successfulley updated Alarm",
      object: DatabaseAlarmService.alarmDocToAlarm(
        await this.databaseServiceAlarm.getAlarmWithId(newDocId),
      ),
    };
  }

  async getAlarms(): Promise<StandartResponse<Alarm[]>> {
    const alarmDocs: AlarmDocument[] = await this.databaseServiceAlarm.getAlarms();
    return {
      message: "List of all Alarms",
      count: alarmDocs.length,
      object: DatabaseAlarmService.alarmDocsToAlarm(alarmDocs),
    };
  }

  async deleteAlarm(id: string): Promise<StandartResponse<Alarm>> {
    const oldDoc: AlarmDocument = await this.databaseServiceAlarm.getAlarmWithId(
      id,
    );
    this.cronService.deleteCron("alarm-" + id);
    await this.databaseServiceAlarm.deleteAlarmWithId(id);
    return {
      message: "Successfully deleted Alarm",
      object: DatabaseAlarmService.alarmDocToAlarm(oldDoc),
    };
  }

  async getAlarmWithId(id: string): Promise<StandartResponse<Alarm>> {
    return {
      message: "Alarm with ID: " + id,
      object: DatabaseAlarmService.alarmDocToAlarm(
        await this.databaseServiceAlarm.getAlarmWithId(id),
      ),
    };
  }
}
