import { Body, Controller, NotFoundException, Param, Patch, ValidationPipe } from "@nestjs/common";
import { UtilsService } from "src/utils.service";
import { Light, StandartResponse } from "../interfaces";
import { ColorsService } from "./colors.service";
import { UpdateLedsDto } from "./dto/update-leds.dto";
@Controller("")
export class ColorsController {
  constructor(
    private readonly service: ColorsService,
    private readonly utilsService: UtilsService,
  ) { }

  @Patch(":id/color")
  async updateLeds(@Param("id") id: string, @Body(new ValidationPipe()) data: UpdateLedsDto): Promise<StandartResponse<Light>> {
    if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!");
    return this.service.updateLeds(id, data);
  }

  @Patch("/tags/:tag/color")
  async updateLedsWithTag(@Param("tag") tag: string, @Body(new ValidationPipe()) data: UpdateLedsDto): Promise<StandartResponse<Light[]>> {
    if (!await this.utilsService.isTagValid(tag)) throw new NotFoundException("There is no light with this Tag!");
    return this.service.updateLedsWithTag(tag, data);
  }
}
