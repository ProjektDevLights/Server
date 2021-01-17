import { Module } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronService } from './cron.service';

@Module({
    providers: [CronService],
    imports: [ScheduleModule.forRoot()],
    exports: [CronService]
})
export class CronModule {}
