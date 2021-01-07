import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Alarm, AlarmSchema } from "src/schemas/alarm.schema";
import { UtilsService } from "src/utils.service";
import { Esp, EspSchema } from "../schemas/esp.schema";
import { ColorsController } from "./colors.controller";
import { ColorsService } from "./colors.service";

@Module({
  providers: [ColorsService, UtilsService],
  controllers: [ColorsController],
  imports: [MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema },  {name: Alarm.name, schema: AlarmSchema}])],
})
export class ColorsModule {

}
