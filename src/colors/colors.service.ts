import { Injectable, ServiceUnavailableException, Type } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as child_process from 'child_process';
import { Response } from 'express';
import { isEqual } from 'lodash';
import { Model } from 'mongoose';
import { NothingChangedException } from 'src/exceptions/nothing-changed.exception';
import { OffException } from 'src/exceptions/off.exception';
import { StandartResponse } from 'src/interfaces';
import { UtilsService } from 'src/utils.service';
import Light from '../interfaces/light.interface';
import { Esp, EspDocument } from '../schemas/esp.schema';
import { UpdateLedsDto } from './dto/update-leds.dto';

@Injectable()
export class ColorsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private utilsService: UtilsService,
  ) {}

  async updateLeds(
    id: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {
    const oldLight: EspDocument = await this.espModel.findOne(
      { uuid: id },
      { __v: 0, _id: 0 },
    );
    if(!oldLight.isOn){
        throw new OffException();
    }
    const newLight: EspDocument = await this.espModel.findOneAndUpdate(
      { uuid: id },
      {
        leds: {
          colors: data.colors ?? undefined,
          pattern: data.pattern ?? undefined,
        },
      },
      {
        new: true,
        projection: { __v: 0, _id: 0 },
      },
    );
    if (isEqual(oldLight, newLight)) {
      throw new NothingChangedException(
        "The color of the light didn't change!",
      );
    }

    const resLight: Light = {
      count: newLight.count,
      name: newLight.name,
      id: newLight.uuid,
      leds: newLight.leds,
      tags: newLight.tags,
      isOn: newLight.isOn,
    };
    const colorArray: string[] = [];
    data.colors.forEach((color: string) => {
      // eslint-disable-next-line quotes
      colorArray.push('"' + this.utilsService.hexToRgb(color) + '"');
    });
    if (data.colors) {
      try {
        child_process.execSync(
          `echo '{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}' | nc ${newLight.ip} 2389`,
        );
      } catch {
        throw new ServiceUnavailableException(
          "The Light is not plugged in or not started yet!",
        );
      }
    }
    return {
      message: "Succesfully changed the color of the light!",
      object: resLight,
    };
  }

  async updateLedsWithTag(
    tag: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    const oldLights: EspDocument[] = await this.espModel.find(
      { tags: { $all: [tag] } },
      { __v: 0, _id: 0 },
    );
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
    const offLights: Light[] = [];

    newLights.forEach(element => {
      if(element.isOn){
        resLights.push({
        count: element.count,
        name: element.name,
        id: element.uuid,
        leds: element.leds,
        tags: element.tags,
        isOn: element.isOn,
        });
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
      try {
        newLights.forEach(element => {
          child_process.execSync(
            `echo '{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}' | nc ${element.ip} 2389`,
          );
        });
      } catch {
        throw new ServiceUnavailableException(
          "The Light is not plugged in or not started yet!",
        );
      }
    }
    return {
      message: "Succesfully changed the color of the light!",
      object: resLights
    };
  }
}
