import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { StandartResponse } from '../../interfaces';
import { Alarm, AlarmDocument } from '../../schemas/alarm.schema';
import { Esp, EspDocument } from '../../schemas/esp.schema';
import { CronService } from '../../services/cron/cron.service';
import { TcpService } from '../../services/tcp/tcp.service';
import { UtilsService } from '../../services/utils/utils.service';
import { AlarmDto } from './dto/alarm.dto';

@Injectable()
export class AlarmService {

  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    @InjectModel(Alarm.name) private alarmModel: Model<AlarmDocument>,
    private databaseServiceEsp: DatabaseEspService,
    private tcpService: TcpService,
    private utilsService: UtilsService,
    private cronService: CronService
  ) { }

  async scheduleAlarm(
    data: AlarmDto
  ): Promise<StandartResponse<Alarm>> {

    const oldDocs = await this.espModel.find({ "uuid": { "$in": data.ids } }).exec();
    const espIds: Esp[] = []
    oldDocs.forEach(element => {
      espIds.push(element._id);
    })
    const oldColors: { colors: string[], id: any }[] = [];
    oldDocs.forEach(element => {
      let colors = element.leds.colors;
      let id = element._id;
      oldColors.push({ colors, id });
    })
    var alarm = new this.alarmModel();

    alarm.date = data.date;
    alarm.color = data.color ?? "#ff0000";
    alarm.days = data.days ?? [];
    alarm.repeat = data.repeat ?? 0;
    alarm.esps.push(...espIds);
    console.log(alarm.esps);
    alarm = await alarm.save();

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
      let alarm = await this.alarmModel.findById(name.split("-")[1]).populate("esps").exec();

      console.log("Farbe 000000")
      alarm.esps.forEach(async esp => {
        const oldDoc: EspDocument = await this.databaseServiceEsp.getEspWithId(esp.uuid);
        await this.databaseServiceEsp.updateEspWithId(esp.uuid, { leds: { colors: ["#000000"], pattern: "waking" }, brightness: 255, isOn: true })
        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
          "#000000",
        )}"], "pattern": "plain"}}`, esp.ip)

        this.tcpService.sendData(JSON.stringify({ command: "on" }), esp.ip)
        this.tcpService.sendData(JSON.stringify({ command: "brightness", data: 255 }), esp.ip)

        console.log("fading")
        this.utilsService.fading(esp.uuid, { color: alarm.color, time: 5000 * 60, delay: (5000 * 60) / 255 }, oldDoc);
      })
    }

    let finished = async (name: string) => {
      console.log("finished")
      this.alarmModel.findByIdAndRemove(name.split("-")[1]).exec();
    }

    console.log("scheduling")
    let schedulerDate: string = date.getSeconds() + " " + date.getMinutes() + " " + date.getHours() + " * * " + (days ?? "*")
    this.cronService.addCronJob("alarm-" + alarm._id.toString(), schedulerDate, repeat, waking, finished, date);



    return { message: "Succesfully scheduled alarm!", object: (await this.alarmModel.find({ _id: alarm.id }, { _id: 0, __v: 0 }).populate("esps", { _id: 0, uuid: 1, name: 1 }).exec())[0] };
  }
}
