import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  ValidationPipe,
} from "@nestjs/common";
import { Alarm, StandartResponse } from "src/interfaces";
import { AlarmService } from "./alarm.service";
import { AlarmDto } from "./dto/alarm.dto";
import { EditAlarmsDto } from "./dto/edit-alarm.dto";

@Controller("alarm")
export class AlarmController {
  constructor(private alarmService: AlarmService) {}

  @Put("")
  async scheduleAlarm(
    @Body(new ValidationPipe()) data: AlarmDto,
  ): Promise<StandartResponse<Alarm>> {
    return this.alarmService.scheduleAlarm(data);
  }

  @Get("")
  async getAlarms(): Promise<StandartResponse<Alarm[]>> {
    return this.alarmService.getAlarms();
  }

  @Delete(":id")
  async deleteAlarm(@Param("id") id: string): Promise<StandartResponse<Alarm>> {
    return this.alarmService.deleteAlarm(id);
  }

  @Get(":id")
  async getWithId(@Param("id") id: string): Promise<StandartResponse<Alarm>> {
    return this.alarmService.getAlarmWithId(id);
  }

  @Patch(":id")
  async editWithId(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: EditAlarmsDto,
  ): Promise<StandartResponse<Alarm>> {
    return this.alarmService.editAlarmWithId(id, data);
  }
}
