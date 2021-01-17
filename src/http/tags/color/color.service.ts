import { Body, Injectable, NotFoundException, Param, Patch, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { Light, StandartResponse } from '../../../interfaces';
import { UpdateLedsDto } from '../../../http/lights/color/dto/update-leds.dto';
import { UtilsService } from '../../../services/utils/utils.service';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TcpService } from '../../../services/tcp/tcp.service';
import { isEqual } from 'lodash';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { BlinkLedsDto } from 'src/http/lights/color/dto/blink-leds.dto';
import { EspController } from 'src/http/esp/esp.controller';

@Injectable()
export class ColorService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private utilsService: UtilsService,
        private tcpService: TcpService
    ) {}

    async updateLedsWithTag(
        tag: string,
        data: UpdateLedsDto,
      ): Promise<StandartResponse<Light[]>> {
        data.colors = this.utilsService.makeValidHexArray(data.colors);
    
        const oldLights: EspDocument[] = await this.espModel.find(
          { tags: { $all: [tag] } },
          { __v: 0, _id: 0 },
        );
    
        const on : boolean[] =  await this.espModel.find(
          { tags: { $all: [tag] } },
          { __v: 0, _id: 0 },
        ).distinct("isOn");
    
        if(!on.every((val, i) => val === true)) throw new ServiceUnavailableException("At least one light is not on! In order to update with tag please turn them on with '/tags/{{tag}}/on'");
       
        await this.espModel
          .updateMany(
            { tags: { $all: [tag] } },
            {
              $set: {
                leds: {
                  colors: data.colors ?? undefined,
                  pattern: data.pattern ?? undefined,
                },
              },
            },
            {
              new: true,
              projection: { __v: 0, _id: 0 },
            },
          )
          .exec();
        const newLights: EspDocument[] = await this.espModel
          .find({ tags: { $all: [tag] } })
          .exec();
    
         const resLights: Light[] = [];
    
        newLights.forEach(async element => {
          if (element.isOn) {
            resLights.push(await this.utilsService.espDocToLight(element));
          }
        });
        if (isEqual(oldLights, newLights)) {
          throw new NothingChangedException(
            "The color of the lights with this tag didn't change!",
          );
        }
    
        const colorArray: string[] = [];
        data.colors.forEach((color: string) => {
          // eslint-disable-next-line quotes
          colorArray.push('"' + this.utilsService.hexToRgb(color) + '"');
        });
        if (data.colors) {   
            newLights.forEach(element => {
              this.tcpService.sendData(`{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}`, element.ip);
            });
        }
        return {
          message: "Succesfully changed the color of the light!",
          object: resLights,
        };
    }
}
