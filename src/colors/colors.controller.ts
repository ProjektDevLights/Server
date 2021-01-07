import {
  Body,
  Controller,

  NotFoundException,
  Param,
  Patch,
  Post,
  ValidationPipe
} from "@nestjs/common";
import { Alarm } from "src/schemas/alarm.schema";
import { UtilsService } from "src/utils.service";
import { Light, StandartResponse } from "../interfaces";
import { ColorsService } from "./colors.service";
import { AlarmDto } from "./dto/alarm.dto";
import { BlinkLedsDto } from "./dto/blink-leds.dto";
import { BlinkingLedsDto } from "./dto/blinking-leds.dto";
import { UpdateLedsDto } from "./dto/update-leds.dto";
@Controller("")
export class ColorsController {
  constructor(
    private readonly service: ColorsService,
    private readonly utilsService: UtilsService,
  ) {}

  @Patch(":id/color")
  async updateLeds(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this ID!");
    return this.service.updateLeds(id, data);
  }

  @Patch("/tags/:tag/color")
  async updateLedsWithTag(
    @Param("tag") tag: string,
    @Body(new ValidationPipe()) data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no light with this Tag!");
    return this.service.updateLedsWithTag(tag, data);
  }

  @Patch("/:id/fade")
  async fadeToColor(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: { color: string; time: number },
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this Tag!");
    return this.service.fadeToColor(id, data);
  }

  @Post("/:id/blink")
  async blinkColor(@Param("id") id: string, @Body(new ValidationPipe()) data: BlinkLedsDto): Promise<StandartResponse<Light>> {
    if(!(await this.utilsService.isIdValid(id))) {
      throw new NotFoundException("There is no light with this id!");
    }
    return this.service.blinkColor(id,data);
  }

  @Patch("/:id/blink/fancy")
  async blinkColorLoop(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: BlinkingLedsDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this id!");
    return this.service.blinkColorLoop(id, data);
  }


  //ALAAAARM 
  @Post("/alarm")
  async scheduleAlarm(
    @Body(new ValidationPipe()) data: AlarmDto,
  ): Promise<StandartResponse<Alarm>> {
    return this.service.scheduleAlarm(data);
  }

}
