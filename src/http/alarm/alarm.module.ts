import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CronModule } from 'src/services/cron/cron.module';
import { TcpModule } from 'src/services/tcp/tcp.module';
import { UtilsService } from 'src/services/utils/utils.service';
import { Alarm, AlarmSchema } from '../../schemas/alarm.schema';
import { Esp, EspSchema } from '../../schemas/esp.schema';
import { CronService } from '../../services/cron/cron.service';
import { AlarmController } from './alarm.controller';
import { AlarmService } from './alarm.service';

@Module({
  controllers: [AlarmController],
  providers: [AlarmService, CronService, UtilsService],
  imports: [ CronModule, TcpModule, MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }, { name: Alarm.name, schema: AlarmSchema }])]
}) 
export class AlarmModule {}
