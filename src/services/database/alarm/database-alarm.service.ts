import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
//@ts-ignore
import cachegoose from "cachegoose";
import { Model, MongooseUpdateQuery } from "mongoose";
import { Alarm, AlarmDocument } from "src/schemas/alarm.schema";

@Injectable()
export class DatabaseAlarmService {
  constructor(
    @InjectModel(Alarm.name) private alarmModel: Model<AlarmDocument>,
  ) {}

  async getAlarms(): Promise<AlarmDocument[]> {
    return (
      this.alarmModel
        .find()
        .populate("esps")
        //@ts-ignore
        .cache(0, "alarm-all")
        .exec()
    );
  }

  async getAlarmWithId(id: string): Promise<AlarmDocument> {

    const alarmDoc: AlarmDocument = this.alarmModel
    .findById(id)
    .populate({
      path: "esps",
      select: '-__v -ip -_id'
    })
    //@ts-ignore
    .cache(0, "alarm-id-" + id)
    .exec()

    return alarmDoc;

  }

  async updateAlarm(id: string, updateQuery: MongooseUpdateQuery<Alarm>) {
    await this.clear("id-" + id);
    this.clear("all");
    const updated: AlarmDocument = await this.alarmModel
      .findByIdAndUpdate(id, updateQuery, { new: true })
      //@ts-ignore
      .cache(0, "alarm-id-" + id)
      .exec();
    return updated;
  }

  async deleteAlarmWithId(id: string): Promise<AlarmDocument> {
    const deleted: AlarmDocument = await this.alarmModel
      .findByIdAndRemove(id)
      .exec();
    this.clear("id-" + id);
    this.clear("all");
    return deleted;
  }

  async addAlarm(alarm: Alarm) {
    await this.clear("all");
    const newAlarm: AlarmDocument = await this.alarmModel.create(alarm);
    return newAlarm;
  }

  clear = (key: string) =>
    new Promise(resolve => cachegoose.clearCache("alarm-" + key, resolve));
}
