import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Alarm, AlarmSchema } from "src/schemas/alarm.schema";
import { AlarmOutGateway } from "../../gateways/alarms/alarm-out.gateway";
import { LightOutGateway } from "../../gateways/lights/light-out.gateway";
import { Esp, EspSchema } from "../../schemas/esp.schema";
import { DatabaseAlarmService } from "./alarm/database-alarm.service";
import { DatabaseEspService } from "./esp/database-esp.service";

@Module({
  providers: [
    DatabaseEspService,
    DatabaseAlarmService,
    LightOutGateway,
    AlarmOutGateway,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: Esp.name, schema: EspSchema },
      { name: Alarm.name, schema: AlarmSchema },
    ]),
  ],
  exports: [DatabaseEspService, DatabaseAlarmService],
})
export class DatabaseModule {}
