import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { ColorsModule } from './colors/colors.module';
import { config } from "./config";
import { EspModule } from './esp/esp.module';
import { Esp, EspSchema } from './schemas/esp.schema';
import { SettingsModule } from './settings/settings.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TcpModule } from './tcp/tcp/tcp.module';

@Module({
  imports: [TcpModule, EspModule, MongooseModule.forRoot(config.database.url, { useFindAndModify: false }), MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }]), ColorsModule, SettingsModule, ScheduleModule.forRoot()],
  controllers: [AppController],
})
export class AppModule { }
