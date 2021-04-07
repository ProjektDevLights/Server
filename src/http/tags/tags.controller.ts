import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { Light, PartialLight, StandartResponse } from "../../interfaces";
import { BlinkLedsDto } from "../lights/color/dto/blink-leds.dto";
import { CustomPatternDto } from "../lights/color/dto/custom-pattern.dto";
import { UpdateLedsDto } from "../lights/color/dto/update-leds.dto";
import UpdateBrightnessDto from "../lights/settings/dto/update-brightness.dto";
import { ColorService } from "./color/color.service";
import { ControlService } from "./control/control.service";
import { GeneralService } from "./general/general.service";
import { SettingsService } from "./settings/settings.service";

@Controller("tags")
export class TagsController {
  constructor(
    private generalService: GeneralService,
    private controlService: ControlService,
    private colorService: ColorService,
    private settingsService: SettingsService,
  ) {}

  //general service

  @Get("")
  async getTags(): Promise<StandartResponse<string[]>> {
    return this.generalService.getTags();
  }

  @Get(":tag")
  async getWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<Light[]>> {
    return this.generalService.getWithTag(tag);
  }

  //control service
  @Patch(":tag/on")
  async onTags(@Param("tag") tag: string): Promise<StandartResponse<Light[]>> {
    return this.controlService.onTags(tag);
  }

  @Patch(":tag/off")
  async offTags(@Param("tag") tag: string): Promise<StandartResponse<Light[]>> {
    return this.controlService.offTags(tag);
  }

  @Post(":tag/restart")
  async restartWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<PartialLight[]>> {
    return this.controlService.restartWithTag(tag);
  }

  @Delete(":tag/reset")
  async resetWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<PartialLight[]>> {
    return this.controlService.resetWithTag(tag);
  }

  //color service

  @Patch(":tag/color")
  updateColor(
    @Param("tag") tag: string,
    @Body(new ValidationPipe()) data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    return this.colorService.updateLedsWithTag(tag, data);
  }

  @Post(":tag/blink")
  async blink(
    @Param("tag") tag: string,
    @Body(new ValidationPipe()) data: BlinkLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    return this.colorService.blink(tag, data);
  }

  @Patch(":tag/custom")
  async custom(
    @Param("tag") tag: string,
    @Body(new ValidationPipe()) data: CustomPatternDto,
  ) {
    return this.colorService.applyCustom(tag, data);
  }

  //settings
  @Patch("/:tag/brightness")
  async brightness(
    @Param("tag") tag: string,
    @Body(new ValidationPipe()) data: UpdateBrightnessDto,
  ): Promise<StandartResponse<Light[]>> {
    return this.settingsService.setBrightness(tag, data.brightness);
  }
}
