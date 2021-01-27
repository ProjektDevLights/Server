import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";
import { Esp } from "./esp.schema";

export type AlarmDocument = Alarm & mongoose.Document;

@Schema()
export class Alarm {
  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  days: number[];

  @Prop({ required: true })
  repeat: number;

  @Prop({ required: true, type: [{ type: String, ref: "Esp" }] })
  esps: Esp[];
}
export const AlarmSchema = SchemaFactory.createForClass(Alarm).set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret._id;
  },
});
