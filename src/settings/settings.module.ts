import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Esp, EspSchema } from 'src/schemas/esp.schema';
import { UtilsService } from 'src/utils.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  providers: [SettingsService, UtilsService],
  controllers: [SettingsController],
  imports: [MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }])],
})
export class SettingsModule { }
