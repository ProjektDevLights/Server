import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import Leds from "../interfaces/led.interface";

export type EspDocument = Esp & Document;

@Schema()
export class Esp {
  @Prop({ required: true, unique: true })
  uuid: string;

  @Prop({ required: true })
  count: number;

  @Prop({ required: true, unique: true })
  ip: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ required: true })
  name: string;

  @Prop(
    raw({
      colors: { type: [String] },
      pattern: { type: String },
      timeout: { type: Number, required: false },
    }),
  )
  leds: Leds;

  @Prop({ required: true })
  isOn: boolean;

  @Prop({ required: true })
  brightness: number;
}

export const EspSchema = SchemaFactory.createForClass(Esp);
