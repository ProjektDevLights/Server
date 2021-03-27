import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";

export type AlarmDocument = Alarm & mongoose.Document;

@Schema()
export class Alarm {
  @Prop({ required: true })
  isOn: boolean;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  time: string; // HH:MM 24

  @Prop({ required: true })
  days: number[];

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  cronPattern: string;

  @Prop({ required: true, type: [{ type: String, ref: "Esp" }] })
  esps: string[];
}
export const AlarmSchema = SchemaFactory.createForClass(Alarm).set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret._id;
  },
});
