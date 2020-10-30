import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { ColorsModule } from './colors/colors.module';
import { EspModule } from './esp/esp.module';
import { Esp, EspSchema } from './schemas/esp.schema';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [EspModule, MongooseModule.forRoot("mongodb://localhost/devlight", { useFindAndModify: false }), MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }]), ColorsModule, SettingsModule],
  controllers: [AppController],
})
export class AppModule { }
