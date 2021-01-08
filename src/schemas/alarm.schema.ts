import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from 'mongoose';
import { Esp } from './esp.schema';

export type AlarmDocument = Alarm & mongoose.Document;

@Schema()
export class Alarm {

    @Prop({required: true})
    color: string;

    @Prop({required: true})
    date: string;

    @Prop({required: true})
    days: number[];

    @Prop({required: true})
    repeat: number;

    @Prop({ required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Esp' }]})
    esps: Esp[];
}

export const AlarmSchema = SchemaFactory.createForClass(Alarm);
