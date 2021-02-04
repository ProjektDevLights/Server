import { Injectable } from "@nestjs/common";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { StandartResponse } from "../../interfaces";
import { Alarm, AlarmDocument } from "../../schemas/alarm.schema";
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

  private onApplicationBootstrap() {}

  async scheduleAlarm(data: AlarmDto): Promise<StandartResponse<Alarm>> {
    const espIds = await this.databaseServiceEsp
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
        name.split("-")[1]
      );
      console.log("Farbe 000000");
      alarm.esps.forEach(async esp => {
        const oldDoc: EspDocument = await this.databaseServiceEsp.getEspWithId(
          esp.uuid,
          );
        const newDoc = await this.databaseServiceEsp.updateEspWithId(oldDoc.uuid, {
          leds: {
            colors: ["#000000"],
            pattern: "waking"
          },
          brightness: 255,
          isOn: true,
        });
        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
          ["#000000"]
          )}, "pattern": "plain"}}`,
          newDoc.ip,
        );
        this.tcpService.sendData(`{ "command": "on" }`,
          newDoc.ip,
        );
        this.tcpService.sendData(
          `{"command": "brightness", "data": 255 }`,
          newDoc.ip,
        );

        console.log("fading");
        this.utilsService.fading(
          newDoc.id,
          { color: alarmWithId.color, time: 5000 * 30, delay: (5000 * 60) / 255 },
          newDoc,
        );
      });
    };

    let finished = async (name: string) => {
      console.log("finished");
      this.databaseServiceAlarm.deleteAlarmWithId(name.split("-")[1]);
    };

    console.log("scheduling");
    let schedulerDate: string =
      date.getSeconds() +
      " " +
      date.getMinutes() +
      " " +
      date.getHours() +
      " * * " +
      (days ?? "*");
    this.cronService.addCronJob(
      "alarm-" + alarm._id.toString(),
      schedulerDate,
      repeat,
      waking,
      finished,
      date,
    );

    //console.log(alarm.esps);

    return {
      message: "Succesfully scheduled alarm!",
      object: await this.databaseServiceAlarm.getAlarmWithId(alarm.id),
    };
  }
}
