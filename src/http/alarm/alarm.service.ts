import { Injectable } from "@nestjs/common";
import { keys, pickBy, remove } from "lodash";
import moment from "moment";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { Alarm, Light, StandartResponse } from "../../interfaces";
import { AlarmDocument } from "../../schemas/alarm.schema";
import { EspDocument } from "../../schemas/esp.schema";
import { CronService } from "../../services/cron/cron.service";
import { TcpService } from "../../services/tcp/tcp.service";
import { UtilsService } from "../../services/utils/utils.service";
import { AlarmDto } from "./dto/alarm.dto";

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

  fadingCallback = async (id: string, color: string): Promise<void> => {
    const alarmIndexes = keys(
      pickBy(this.runningAlarms, entry => entry.id.includes(id)),
    );
    alarmIndexes.forEach((i: string) => {
      this.databaseServiceEsp
        .updateEspWithId(this.runningAlarms[parseInt(i)].id.split("-")[0], {
          leds: {
            colors: [color],
            pattern: "plain",
          },
        })
        .then((espDoc: EspDocument) => {



          this.tcpService.sendData(
            this.utilsService.genJSONforEsp(
              "leds", {
              "colors": this.utilsService.hexToRgb(this.utilsService.hexArrayToRgb([color])), "pattern": "plain"
            }),
            espDoc.ip,
          );
        });
      try {
        clearInterval(this.runningAlarms[parseInt(i)].interval);
      } catch {}
      this.runningAlarms[parseInt(i)] = undefined;
    });
    remove(this.runningAlarms, value => value == undefined);
  };

  async scheduleAlarm(data: AlarmDto): Promise<StandartResponse<Alarm>> {
    data.color = this.utilsService.makeValidHex(data.color);
    const espIds: string[] = await this.databaseServiceEsp
      .getEspsWithMultipleIds(data.ids, true)
      .distinct("_id")
      .exec();

    const alarm: AlarmDocument = await this.databaseServiceAlarm.addAlarm({
      date: data.date,
      color: data.color,
      days: data.days ?? [],
      repeat: data.repeat ?? 0,
      esps: espIds,
    });

    const date = new Date(alarm.date);
    const days = alarm.days.join(",");

    let repeat = alarm.repeat;
    if (!alarm.days.length) {
      repeat = 0;
    } else {
      if (repeat > 0) {
        repeat = (repeat + 1) * alarm.days.length;
        if (!alarm.days.includes(date.getDay())) {
          repeat++;
        }
      }
    }

    let waking = async (name: string) => {
      let alarmWithId = await this.databaseServiceAlarm.getAlarmWithId(
        name.split("-")[1],
      );

      alarmWithId.esps.forEach(async esp => {
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
          this.utilsService.genJSONforEsp(
            "leds", {
            "colors": this.utilsService.hexArrayToRgb(["#000000"],), "pattern": "plain"
          }),
          newDoc.ip,
        );
        this.tcpService.sendData(this.utilsService.genJSONforEsp("on"), newDoc.ip);
        this.tcpService.sendData(this.utilsService.genJSONforEsp("brightness", 255),newDoc.ip,);

        const interval: NodeJS.Timeout = this.utilsService.fading(
          newDoc.id,
          {
            color: alarmWithId.color,
            time: 5000 * 60,
            delay: (5000 * 60) / 255,
          },
          newDoc,
          () => this.fadingCallback(name.split("-")[1], alarmWithId.color),
        );
        this.runningAlarms.push({
          id: newDoc.uuid + "-" + alarmWithId.id,
          interval: interval,
        });
      });
    };

    let finished = async (name: string) => {
      const id = name.split("-")[1];
      this.databaseServiceAlarm.deleteAlarmWithId(id);
    };

    let schedulerDate: string =
      date.getSeconds() +
      " " +
      date.getMinutes() +
      " " +
      date.getHours() +
      " * * " +
      (days.length ? days : "*");

    this.cronService.addCronJob(
      "alarm-" + alarm._id.toString(),
      !days.length && !repeat
        ? moment.utc(alarm.date).add(2, "seconds")
        : schedulerDate,
      repeat,
      waking,
      finished,
      date,
    );
    return {
      message: "Succesfully scheduled alarm!",
      object: DatabaseAlarmService.alarmDocToAlarm(
        await this.databaseServiceAlarm.getAlarmWithId(alarm.id),
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

  async stopAlarm(id: string): Promise<StandartResponse<Alarm>> {
    const alarm: AlarmDocument = await this.databaseServiceAlarm.getAlarmWithId(
      id,
    );
    this.fadingCallback(id, alarm.color);
    return {
      message: "Succesfully stopped alarm with ID " + id,
      object: DatabaseAlarmService.alarmDocToAlarm(alarm),
    };
  }
}
