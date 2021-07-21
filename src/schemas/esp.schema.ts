import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { CustomData } from "../http/lights/color/dto/custom-pattern.dto";
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

  @Prop()
  custom_sequence?: CustomData[];

  @Prop({ required: true })
  isOn: boolean;

  @Prop({ required: true })
  brightness: number;

  @Prop({ required: true })
  position: number;

  @Prop()
  comment?: string;
}

export const EspSchema = SchemaFactory.createForClass(Esp);
