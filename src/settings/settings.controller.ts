import { Body, Controller, Delete, Get, NotFoundException, Param, ParseArrayPipe, ParseIntPipe, Patch, Post, ValidationPipe } from '@nestjs/common';
import { Res } from '@nestjs/common/decorators/http/route-params.decorator';
import { Response } from "express";
import { Light, PartialLight, StandartResponse } from '../interfaces/';
import { UtilsService } from '../utils.service';
import UpdateInfoDto from './dto/update.dto';
import UpdateTagsDto from './dto/update-tags.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService, private readonly utilsService: UtilsService) { }

    @Post(":id")
    async restart(@Param("id") id: string): Promise<StandartResponse<PartialLight>> {
        if (! await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no Light with this ID!")
        return this.service.restart(id);
    }

    @Patch("count/:id")
    async count(@Param("id") id: string, @Body("count", ParseIntPipe) count: number): Promise<StandartResponse<{ name: string, id: string, count: number }>> {
        if (! await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no Light with this ID!")
        return this.service.count(id, count)
    }

    @Delete(":id")
    async reset(@Param("id") id: string): Promise<StandartResponse<PartialLight>> {
        if (! await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no Light with this ID!")
        return this.service.reset(id);
    }

    @Get("")
    async getAll(): Promise<StandartResponse<Light[]>> {
        return this.service.getAll();
    }

    @Get(":id")
    async get(@Param("id") id: string): Promise<StandartResponse<Light>> {
        if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.get(id);
    }

    @Patch(":id")
    async update(@Param("id") id: string, @Body() data: UpdateInfoDto, @Res() res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.update(id, data, res);
    }

    @Post("tags/:id")
    async addTags(@Param("id") id: string, @Body(new ValidationPipe()) data: UpdateTagsDto, @Res() res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.addTags(id, data, res);
    }

    @Delete("tags/:id")
    async removeTags(@Param("id") id: string, @Body(new ValidationPipe()) data: UpdateTagsDto, @Res() res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.removeTags(id, data, res);
    }

    @Get("tags/:tag")
    async getWithTag(@Param("tag") tag: string, @Res() res: Response<StandartResponse<Light[]>>): Promise<StandartResponse<Light[]>> {
        //if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.getWithTag(tag, res);
    }
}
