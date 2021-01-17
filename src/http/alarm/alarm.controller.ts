import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { StandartResponse } from 'src/interfaces';
import { Alarm } from 'src/schemas/alarm.schema';
import { AlarmService } from './alarm.service';
import { AlarmDto } from './dto/alarm.dto';

@Controller('alarm')
export class AlarmController {

    constructor(
        private alarmService: AlarmService
    ) {}

    @Post("")
    async scheduleAlarm(
        @Body(new ValidationPipe()) data: AlarmDto
    ): Promise<StandartResponse<Alarm>> {
        return this.alarmService.scheduleAlarm(data);
    }

}
