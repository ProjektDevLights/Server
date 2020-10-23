import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import Leds from "src/interfaces/led.interface";


export type EspDocument = Esp & Document

@Schema()
export class Esp {

  @Prop({ required: true })
  count: number

  @Prop({ required: true, unique: true })
  uuid: string

  @Prop({ required: true, unique: true })
  ip: string

  @Prop({ required: true })
  name: string

  @Prop(raw({
    colors: { type: [String] },
    pattern: { type: String },
  }))
  leds: Leds

}

export const EspSchema = SchemaFactory.createForClass(Esp)
