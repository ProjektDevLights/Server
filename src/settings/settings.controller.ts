
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  ValidationPipe,
  CacheInterceptor,
  UseInterceptors
} from "@nestjs/common";
import { HttpCode } from "@nestjs/common/decorators/http/http-code.decorator";
import { Light, PartialLight, StandartResponse } from "../interfaces/";
import { UtilsService } from "../utils.service";
import UpdateTagsDto from "./dto/update-tags.dto";
import UpdateInfoDto from "./dto/update.dto";
import { SettingsService } from "./settings.service";

@Controller("")
export class SettingsController {
  constructor(
    private readonly service: SettingsService,
    private readonly utilsService: UtilsService,
  ) {}

  @Post(":id")
  async restart(
    @Param("id") id: string,
  ): Promise<StandartResponse<PartialLight>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no Light with this ID!");
    return this.service.restart(id);
  }

  @HttpCode(200)
  @Post("tags/:tag/restart")
  async restartWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<PartialLight[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no Light with this TAG!");
    return this.service.restartWithTag(tag);
  }

  @Patch("count/:id")
  async count(
    @Param("id") id: string,
    @Body("count", ParseIntPipe) count: number,
  ): Promise<StandartResponse<{ name: string; id: string; count: number }>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no Light with this ID!");
    return this.service.count(id, count);
  }

  @Delete(":id")
  async reset(
    @Param("id") id: string,
  ): Promise<StandartResponse<PartialLight>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no Light with this ID!");
    return this.service.reset(id);
  }

  @HttpCode(200)
  @Delete("tags/:tag/reset")
  async resetWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<PartialLight[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no Light with this TAG!");
    return this.service.resetWithTag(tag);
  }

  @UseInterceptors(CacheInterceptor)
  @Get("/")
  async getAll(): Promise<StandartResponse<Light[]>> {
    return this.service.getAll();
  }

  @UseInterceptors(CacheInterceptor)
  @Get(":id")
  async get(@Param("id") id: string): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this ID!");
    return this.service.get(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() data: UpdateInfoDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this ID!");
    return this.service.update(id, data);
  }

  @Patch(":id/on")
  async on(@Param("id") id: string): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is not light with this ID!");
    return this.service.on(id);
  }

  @Patch(":id/off")
  async off(@Param("id") id: string): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is not light with this ID!");
    return this.service.off(id);
  }

  @Post(":id/tags")
  async addTags(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this ID!");
    return this.service.addTags(id, data);
  }

  @Delete(":id/tags")
  async removeTags(
    @Param("id") id: string,
    @Body(new ValidationPipe()) data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(id)))
      throw new NotFoundException("There is no light with this ID!");
    return this.service.removeTags(id, data);
  }

  @Patch("tags/:tag/on")
  async onTags(@Param("tag") tag: string): Promise<StandartResponse<Light[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no light with this tag!");
    return this.service.startTags(tag);
  }

  @Patch("tags/:tag/off")
  async offTags(@Param("tag") tag: string): Promise<StandartResponse<Light[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no light with this tag!");
    return this.service.offTags(tag);
  }

  @UseInterceptors(CacheInterceptor)
  @Get("tags/:tag")
  @Get("tags/:tag")
  async getWithTag(
    @Param("tag") tag: string,
  ): Promise<StandartResponse<Light[]>> {
    if (!(await this.utilsService.isTagValid(tag)))
      throw new NotFoundException("There is no light with this tag!");
    return this.service.getWithTag(tag);
  }
}
