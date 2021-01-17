import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EspModule } from './http/esp/esp.module';
import { config } from './config';
import { LightsModule } from './http/lights/lights.module';
import { TagsModule } from './http/tags/tags.module';
import { AlarmModule } from './http/alarm/alarm.module';

@Module({
    imports: [
        EspModule,
        MongooseModule.forRoot(config.database.url, { useFindAndModify: false }),
        LightsModule,
        TagsModule,
        AlarmModule,
    ]
}) 
export class MainModule {} 
