import { Body, Controller, Delete, Get, Param, Put, ValidationPipe } from "@nestjs/common";
import { StandartResponse, Alarm } from "src/interfaces";
import { AlarmService } from "./alarm.service";
import { AlarmDto } from "./dto/alarm.dto";

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
   async getAlarms() : Promise<StandartResponse<Alarm[]>> {
     return this.alarmService.getAlarms();
   }

   @Delete(":id")
   async deleteAlarm(@Param("id") id: string): Promise<StandartResponse<Alarm>> {
     return this.alarmService.deleteAlarm(id);
   }

   @Delete(":id/stop")
   async stopAlarm(@Param("id") id: string): Promise<StandartResponse<Alarm>>{
    return this.alarmService.stopAlarm(id);
   }


   @Get(":id")
   async getWithId(@Param("id") id: string) : Promise<StandartResponse<Alarm>> {
     return this.alarmService.getAlarmWithId(id);
   }
}
