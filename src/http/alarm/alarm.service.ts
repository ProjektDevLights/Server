import { BadRequestException, Injectable } from "@nestjs/common";
import { findIndex, forIn, intersection, isEqual, map } from "lodash";
import moment from "moment";
import { AlarmConflictException } from "src/exceptions/alarm-conflict.exception";
import { InvalidIdException } from "src/exceptions/invalid-id.exception";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../exceptions/nothing-changed.exception";
import { Alarm, Light, StandartResponse, Time } from "../../interfaces";
import CustomData from "../../interfaces/custom-data.interface";
import { AlarmDocument } from "../../schemas/alarm.schema";
import { CronService } from "../../services/cron/cron.service";
import { TcpService } from "../../services/tcp/tcp.service";
import { UtilsService } from "../../services/utils/utils.service";
import { AlarmDto } from "./dto/alarm.dto";
import { EditAlarmsDto } from "./dto/edit-alarm.dto";

export type Conflict = {
  alarm: string;
  esps: string[];
  days: number[];
  time: Time;
};
@Injectable()
export class AlarmService {
  constructor(
    private databaseServiceAlarm: DatabaseAlarmService,
    private databaseServiceEsp: DatabaseEspService,
    private tcpService: TcpService,
    private utilsService: UtilsService,
    private cronService: CronService,
  ) { }

  async rescheduleJobs(): Promise<void> {
    const alarms: AlarmDocument[] = await this.databaseServiceAlarm.getAlarms();
    alarms.forEach((alarm: AlarmDocument) => {
      if (alarm.isOn) {
        this.cronService.addCron(
          `alarm-${alarm._id}`,
          alarm.cronPattern,
          this.callback,
        );
      }
    });
  }

  private onApplicationBootstrap() {
    this.rescheduleJobs()
    
  }

  // executed when alarm is firing
  private callback = async (name: string) => {
    let alarm: AlarmDocument = await this.databaseServiceAlarm.getAlarmWithId(
      name.split("-")[1],
    );

    alarm.esps.forEach(async esp => {
      try {
        const oldDoc = await this.databaseServiceEsp.getEspWithId(
          //@ts-ignore
          esp.uuid,
        );
        const oldLight: Light = DatabaseEspService.espDocToLight(oldDoc);

        this.tcpService.sendData(
          this.utilsService.genJSONforEsp({ command: "on" }),
          oldDoc.ip,
        );
        this.tcpService.sendData(
          this.utilsService.genJSONforEsp({ command: "brightness", data: 1 }),
          oldDoc.ip,
        );


        if (alarm.leds.pattern == "custom" && alarm.custom_sequence.length > 0) {
          let sendColors: string[] = [];

          alarm.custom_sequence.forEach((d: CustomData) => {
            for (let i = 0; i < d.repeat; i++) {
              sendColors = sendColors.concat(d.leds);
            }
          });
          this.tcpService.sendData(
            this.utilsService.genJSONforEsp({ command: "custom", data: sendColors }),
            oldDoc.ip,
          );
        } else {
          this.tcpService.sendData(this.utilsService.genJSONforEsp({
            command: "leds",
            data: {
              colors: alarm.leds.colors,
              pattern: alarm.leds.pattern,
              timeout: alarm.leds.timeout
            },
          }), oldDoc.ip);
        }

        await this.databaseServiceEsp.updateEspWithId(
          oldLight.id,
          {
            leds: {
              pattern: "waking",
              colors: this.utilsService.makeValidHexArray(alarm.leds.colors),
            },

            brightness: 255,
            isOn: true,
          },
        );
        if (alarm.leds.pattern === "custom" && alarm.custom_sequence != null) {
          await this.databaseServiceEsp.updateEspWithId(oldLight.id, { custom_sequence: alarm.custom_sequence });
        }

        
        if(alarm.leds.pattern !== "rainbow") {
          await this.utilsService.fadeBrightness(oldDoc.ip, 1000 * 60,
            (5000 * 60) / 254);
        }

        this.databaseServiceEsp.updateEspWithId(oldLight.id, {
          leds: {
            pattern: alarm.leds.pattern,
            colors: this.utilsService.makeValidHexArray(alarm.leds.colors),
            timeout: alarm.leds.timeout ?? undefined
          },
          brightness: 255,
          isOn: true,
        });
      } catch { }
    });
  };

  //determines if other alarms would fire the same time as given alarm
  private getConflictingAlarms(
    time: Time,
    days: number[],
    isOn: boolean,
    esps: string[], // uuids
    alarms: AlarmDocument[],
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    alarms.forEach(alarm => {
      if (alarm.isOn && isOn) {
        if (intersection(days, alarm.days).length) {
          if (
            Math.round(
              Math.abs(
                moment(alarm.time, "hh:mm").unix() / 60 -
                moment(time, "hh:mm").unix() / 60,
              ),
            ) < 5
          ) {
            if (intersection(esps, map(alarm.esps, "uuid")).length) {
              conflicts.push({
                alarm: alarm.id,
                esps: intersection(esps, map(alarm.esps, "uuid")),
                days: intersection(days, alarm.days),
                time: alarm.time,
              });
            }
          }
        }
      }
    });
    return conflicts;
  }

  // checks wether light ids are all valid
  private async validateIds(ids: string[] = []): Promise<string[]> {
    const invalids: string[] = [];
    for (let index = 0; index < ids.length; index++) {
      const element = ids[index];
      const isValid = await this.utilsService.isIdValid(element);
      if (!isValid) invalids.push(element);
    }
    return invalids;
  }

  async scheduleAlarm(data: AlarmDto): Promise<StandartResponse<Alarm>> {
    const allAlarms: AlarmDocument[] = await this.databaseServiceAlarm.getAlarms();

    if (data.leds == null && data.custom_sequence == null) {
      throw new BadRequestException(
        `Alarms should either have a leds prop or a custom sequence`,
      );
    }

    const invalids = await this.validateIds(data.ids);
    if (invalids.length > 0) throw new InvalidIdException(invalids);
    const conflicts: Conflict[] = this.getConflictingAlarms(
      data.time,
      data.days ?? [0, 1, 2, 3, 4, 5, 6],
      true,
      data.ids,
      allAlarms,
    );
    if (conflicts.length > 0) {
      throw new AlarmConflictException(conflicts);
    }
    let colors: string[] = [];
    if (data.custom_sequence != null && data.custom_sequence != undefined) {

      data.custom_sequence.forEach((customData: CustomData, index: number) => {
        colors = colors.concat(
          this.utilsService.makeValidHexArray(customData.leds),
        );
        data.custom_sequence[index].leds = this.utilsService.makeValidHexArray(
          customData.leds,
        );
      });

      let sendColors: string[] = [];

      data.custom_sequence.forEach((d: CustomData) => {
        for (let i = 0; i < d.repeat; i++) {
          sendColors = sendColors.concat(d.leds);
        }
      });
    }

    const splitTime: string[] = data.time.split(":");
    const daysString: string = data.days?.length
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
        leds: data.custom_sequence ? {
          colors: colors,
          pattern: "custom",
        } : data.leds,
        custom_sequence: data.custom_sequence,
        cronPattern: cronPattern,
        days: daysString.split(",").map(x => +x),
        esps: espIds,
        isOn: true,
        name: data.name ?? "New Alarm",
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
    let equal: boolean = true;
    forIn(request, (data: unknown, key: string) => {
      if (
        (data && !isEqual(data, database[key])) ||
        (key === "isOn" && !isEqual(data, database[key]))
      ) {
        equal = false;
      }
    });
    return equal;
  }

  async editAlarmWithId(
    id: string,
    data: EditAlarmsDto,
  ): Promise<StandartResponse<Alarm>> {
    const invalids = await this.validateIds(data.ids);
    if (invalids.length > 0) throw new InvalidIdException(invalids);

    const alarmDoc = await this.databaseServiceAlarm.getAlarmWithId(id);
    if (
      this.checkEquality(data, {
        leds: alarmDoc.leds,
        days: alarmDoc.days,
        ids: map(alarmDoc.esps, "uuid"),
        name: alarmDoc.name,
        time: alarmDoc.time,
        isOn: alarmDoc.isOn,
      })
    ) {
      throw new NothingChangedException();
    }
    if (data.days !== undefined && data.days.length === 0) {
      throw new BadRequestException("days should not be empty");
    }

    const allAlarms: AlarmDocument[] = await this.databaseServiceAlarm.getAlarms();
    allAlarms.splice(
      findIndex(allAlarms, (alarm: AlarmDocument) => alarm._id == id),
      1,
    );

    const conflicts: Conflict[] = this.getConflictingAlarms(
      data.time ?? alarmDoc.time,
      data.days ?? alarmDoc.days,
      data.isOn === false || data.isOn === true ? data.isOn : alarmDoc.isOn,
      data.ids ?? map(alarmDoc.esps, "uuid"),
      allAlarms,
    );
    if (conflicts.length > 0) {
      throw new AlarmConflictException(conflicts);
    }

    let cronPattern: string = undefined;

    //if off remove cron
    if (data.isOn === false) {
      this.cronService.deleteCron(`alarm-${alarmDoc.id}`);
    }
    let leds;
    if (data.custom_sequence) {

      if (data.leds != null) {
        throw new BadRequestException(
          `Alarms should either have a leds prop or a custom sequence`,
        );
      }

      let colors: string[] = [];
      data.custom_sequence.forEach((customData: CustomData, index: number) => {
        colors = colors.concat(
          this.utilsService.makeValidHexArray(customData.leds),
        );
        data.custom_sequence[index].leds = this.utilsService.makeValidHexArray(
          customData.leds,
        );
      });
      if (JSON.stringify(alarmDoc.custom_sequence) == JSON.stringify(data.custom_sequence))
        throw new NothingChangedException();

      leds = {
        colors,
        pattern: "custom",
      };
    }

    //schedule with new pattern
    if (
      ((data.time && data.time != alarmDoc.time) ||
        (data.days && data.days != alarmDoc.days)) &&
      (data.isOn === true || (data.isOn !== false && alarmDoc.isOn))
    ) {
      const splitTime: string[] = data.time
        ? data.time.split(":")
        : alarmDoc.time.split(":");
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
      //reschedule with old data
    } else if (data.isOn === true && alarmDoc.isOn === false) {
      //should not exist, but weird shit can happen
      this.cronService.deleteCron(`alarm-${alarmDoc.id}`);
      this.cronService.addCron(
        `alarm-${id}`,
        alarmDoc.cronPattern,
        this.callback,
      );
    }

    const espIds: string[] = await this.databaseServiceEsp
      .getEspsWithMultipleIds(data.ids ?? map(alarmDoc.esps, "uuid"), true)
      .distinct("_id")
      .exec();
    const newDocId: string = (
      await this.databaseServiceAlarm.updateAlarm(id, {
        esps: espIds,
        name: data.name ?? alarmDoc.name,
        time: data.time ?? alarmDoc.time,
        isOn: data.isOn ?? alarmDoc.isOn,
        days: data.days ?? alarmDoc.days,
        leds: leds && data.custom_sequence ? leds : data.leds ?? alarmDoc.leds,
        //custom_sequence: data.custom_sequence ? data.custom_sequence : alarmDoc.custom_sequence ?? undefined,
        custom_sequence: data.custom_sequence ? data.custom_sequence : data.leds?.pattern !== "custom" ? undefined : alarmDoc.custom_sequence ?? undefined,
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
      message: "Alarm with Id: " + id,
      object: DatabaseAlarmService.alarmDocToAlarm(
        await this.databaseServiceAlarm.getAlarmWithId(id),
      ),
    };
  }
}
