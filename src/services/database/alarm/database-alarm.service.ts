import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
//@ts-ignore
import cachegoose from "cachegoose";
import { Model, UpdateQuery } from "mongoose";
import { Alarm, AlarmDocument } from "src/schemas/alarm.schema";
import { AlarmOutGateway } from "../../../gateways/alarm-out.gateway";
import { Alarm as AlarmInterface } from "../../../interfaces";
import { DatabaseEspService } from "../esp/database-esp.service";

@Injectable()
export class DatabaseAlarmService {
  constructor(
    @InjectModel(Alarm.name) private alarmModel: Model<AlarmDocument>,
    private gateway: AlarmOutGateway,
  ) {}

  async getAlarms(): Promise<AlarmDocument[]> {
    return await this.alarmModel
      .find()
      .populate({
        path: "esps",
        select: "-__v -ip -_id",
      })
      //@ts-ignore
      .exec();
  }

  async getAlarmWithId(id: string): Promise<AlarmDocument> {
    return await this.alarmModel
      .findById(id)
      .populate({
        path: "esps",
        select: "-__v -_id",
      })
      //@ts-ignore
      //.cache(0, "alarm-id-" + id)
      .exec();
  }

  async updateAlarm(id: string, updateQuery: UpdateQuery<Alarm>) {
    await this.clear("id-" + id);
    this.clear("all");
    const updated: AlarmDocument = await this.alarmModel
      .findByIdAndUpdate(id, updateQuery, { new: true })
      //@ts-ignore
      .cache(0, "alarm-id-" + id)
      .exec();
    this.gateway.sendChange(updated);
    return updated;
  }

  async deleteAlarmWithId(id: string): Promise<AlarmDocument> {
    const deleted: AlarmDocument = await this.alarmModel
      .findByIdAndRemove(id)
      .exec();
    this.clear("id-" + id);
    this.clear("all");
    this.gateway.sendRemove(deleted);
    return deleted;
  }

  async addAlarm(alarm: Alarm) {
    await this.clear("all");
    const newAlarm: AlarmDocument = await this.alarmModel.create(alarm);
    this.gateway.sendAdd(newAlarm);
    return newAlarm;
  }

  static alarmDocsToAlarm(docs: AlarmDocument[]): AlarmInterface[] {
    const alarms: AlarmInterface[] = [];
    docs.forEach((doc: AlarmDocument) => {
      alarms.push(this.alarmDocToAlarm(doc));
    });
    return alarms;
  }

  static alarmDocToAlarm(doc: AlarmDocument): AlarmInterface {
    return {
      name: doc.name,
      isOn: doc.isOn,
      id: doc._id,
      color: doc.color,
      time: doc.time,
      days: doc.days,
      //@ts-ignore
      lights: DatabaseEspService.espDocsToPartialLights(doc.esps),
    };
  }

  clear = (key: string) =>
    new Promise(resolve => cachegoose.clearCache("alarm-" + key, resolve));
}
