import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  ValidationPipe,
} from "@nestjs/common";
import { Light, PartialLight, StandartResponse } from "../../interfaces";
import { ColorService } from "./color/color.service";
import { BlinkLedsDto } from "./color/dto/blink-leds.dto";
import { BlinkingLedsDto } from "./color/dto/blinking-leds.dto";
import { UpdateLedsDto } from "./color/dto/update-leds.dto";
import { ControlService } from "./control/control.service";
import { GeneralService } from "./general/general.service";
import UpdateBrightnessDto from "./settings/dto/update-brightness.dto";
import UpdateCountDto from "./settings/dto/update-count.dto";
import UpdateTagsDto from "./settings/dto/update-tags.dto";
import UpdateInfoDto from "./settings/dto/update.dto";
import { SettingsService } from "./settings/settings.service";

@Controller("lights")
export class LightsController {
  constructor(
    private generalService: GeneralService,
    private controlService: ControlService,
    private settingsService: SettingsService,
    private colorService: ColorService,
  ) {}

  //general service
  @Get("")
  async getAll(): Promise<StandartResponse<Light[]>> {
    return this.generalService.getAll();
  }

  @Get(":light")
  async get(@Param("light") id: string): Promise<StandartResponse<Light>> {
    return this.generalService.get(id);
  }

  @Post(":light/pass")
  async pass(
    @Param("light") id: string,
    @Body("command") data: string,
  ): Promise<StandartResponse<Light>> {
    return this.generalService.pass(id, data);
  }

  //control service
  @Patch(":light/on")
  async turnOn(@Param("light") id: string): Promise<StandartResponse<Light>> {
    return this.controlService.on(id);
  }

  @Patch(":light/off")
  async turnOff(@Param("light") id: string): Promise<StandartResponse<Light>> {
    return this.controlService.off(id);
  }

  @Post(":light/restart")
  async restart(
    @Param("light") id: string,
  ): Promise<StandartResponse<PartialLight>> {
    return this.controlService.restart(id);
  }

  @Delete(":light/reset")
  async reset(
    @Param("light") id: string,
  ): Promise<StandartResponse<PartialLight>> {
    return this.controlService.reset(id);
  }

  //settings service
  @Patch(":light/update")
  async update(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateInfoDto,
  ): Promise<StandartResponse<Light>> {
    return this.settingsService.update(id, data);
  }

  @Patch(":light/brightness")
  async brightness(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateBrightnessDto,
  ): Promise<StandartResponse<Light>> {
    return this.settingsService.setBrightness(id, data.brightness);
  }

  @Patch(":light/count")
  async count(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateCountDto,
  ): Promise<StandartResponse<Light>> {
    return this.settingsService.count(id, data.count);
  }

  @Put(":light/tags")
  async addTags(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    return this.settingsService.addTags(id, data);
  }

  @Delete(":light/tags")
  async removeTags(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    return this.settingsService.removeTags(id, data);
  }

  //color service
  @Patch(":light/color")
  async updateColor(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {
    return this.colorService.updateLeds(id, data);
  }

  @Post(":light/fade")
  async fadeToColor(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: { color: string; time: number },
  ): Promise<StandartResponse<Light>> {
    return this.colorService.fadeToColor(id, data);
  }

  @Post("/:light/blink")
  async blinkColor(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: BlinkLedsDto,
  ): Promise<StandartResponse<Light>> {
    return this.colorService.blinkColor(id, data);
  }

  @Post("/:light/blink/fancy")
  async blinkColorLoop(
    @Param("light") id: string,
    @Body(new ValidationPipe()) data: BlinkingLedsDto,
  ): Promise<StandartResponse<Light>> {
    return this.colorService.blinkColorLoop(id, data);
  }
}
