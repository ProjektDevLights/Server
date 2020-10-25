import { Body, Controller, NotFoundException, Param, Patch, Res, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { UtilsService } from 'src/utils.service';
import { Light, StandartResponse } from '../interfaces';
import { ColorsService } from './colors.service';
import { UpdateLedsDto } from './dto/update-leds.dto';
@Controller('colors')
export class ColorsController {

    constructor(private readonly service: ColorsService, private readonly utilsService: UtilsService) { }

    @Patch(":id")
    async UpdateLeds(@Param("id") id: string, @Body(new ValidationPipe()) data: UpdateLedsDto, @Res() res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.updateLeds(id, data, res);
    }

    @Patch("/tag/:tag")
    async UpdateLedsWithTag(@Param("tag") tag: string, @Body(new ValidationPipe()) data: UpdateLedsDto, @Res() res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        //if (!await this.utilsService.isIdValid(id)) throw new NotFoundException("There is no light with this ID!")
        return this.service.updateLedsWithTag(tag, data, res);
    }

}
