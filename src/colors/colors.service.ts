import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as child_process from 'child_process';
import { time } from 'console';
import { isEqual } from 'lodash';
import { Model } from 'mongoose';
import { CustomException } from 'src/exceptions/custom-exception.exception';
import { NothingChangedException } from 'src/exceptions/nothing-changed.exception';
import { OffException } from 'src/exceptions/off.exception';
import { StandartResponse } from 'src/interfaces';
import { UtilsService } from 'src/utils.service';
import { ColorFormats } from 'tinycolor2';
import Light from '../interfaces/light.interface';
import { Esp, EspDocument } from '../schemas/esp.schema';
import { UpdateLedsDto } from './dto/update-leds.dto';
var tinycolor = require("tinycolor2");

@Injectable()
export class ColorsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private utilsService: UtilsService,
  ) { }

  async updateLeds(
    id: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {

    const oldLight: EspDocument = await this.espModel.findOne(
      { uuid: id },
      { __v: 0, _id: 0 },
    );

    if (!oldLight.isOn) {
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

    const resLight: Light = await this.utilsService.espDocToLight(newLight);
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

  async fadeToColor(
    id: string,
    data: { color: string, time: number },
  ): Promise<StandartResponse<Light>> {

    const oldLight: EspDocument = await this.espModel.findOne(
      { uuid: id },
      { __v: 0, _id: 0 },
    );

  

    if (oldLight.leds.pattern != "plain") {
        throw new CustomException("Pattern must be Plain!", 400);
    }
    if (oldLight.leds.colors[0] === data.color) {
      throw new NothingChangedException();
    }


    const resDoc = await this.espModel.findOneAndUpdate(
      { uuid: id },
      {
        leds: {
          colors: [data.color] ?? undefined,
          pattern: "plain"
        },
      },
      {
        new: true,
        projection: { __v: 0, _id: 0 },
      },
    );
    const resLight: Light = await this.utilsService.espDocToLight(resDoc);
  

    let colorTo: ColorFormats.RGB = tinycolor(data.color).toRgb();

    let colorStart: ColorFormats.RGB = tinycolor(oldLight.leds.colors[0]).toRgb();
    const delay = 1000; //data.time

    console.log({colorStart, colorTo});
    
    let rStep: number =  Math.ceil((colorStart.r - colorTo.r) * delay / data.time); // 100 100/30 => 10/3 werte/step //100 steps => fertig nach 100
    let gStep: number =  Math.ceil((colorStart.g - colorTo.g) * delay / data.time); // 50 50/30 => 5/3 werte/step //50 => fertig nach 50
    let bStep: number =  Math.ceil((colorStart.b - colorTo.b) * delay / data.time); // 30 => 30steps 1000s  // 30 => 30
    console.log({rStep,gStep,bStep})
    let runs: number = Math.ceil(data.time/delay);
    const runInterval = setInterval(() => {
      if(runs <= 0) {
        child_process.exec(
          `echo '{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(tinycolor(colorTo).toHexString())}"], "pattern": "plain"}}' | nc ${oldLight.ip} 2389`,
        );
        clearInterval(runInterval);
        return;
      }
      colorStart.r = colorStart.r - rStep < colorTo.r && rStep >= 0 ? colorTo.r : colorStart.r - rStep > colorTo.r && rStep <= 0 ? colorTo.r : colorStart.r - rStep;
      colorStart.g = colorStart.g - gStep < colorTo.g && gStep >= 0 ? colorTo.g : colorStart.g - gStep > colorTo.g && gStep <= 0 ? colorTo.g : colorStart.g - gStep;
      colorStart.b = colorStart.b - bStep < colorTo.b && bStep >= 0 ? colorTo.b : colorStart.b - bStep > colorTo.b && bStep <= 0 ? colorTo.b : colorStart.b - bStep;
      console.log(colorStart);
      child_process.exec(
        `echo '{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(tinycolor(colorStart).toHexString())}"], "pattern": "plain"}}' | nc ${oldLight.ip} 2389`,
      );
      runs--;
    }, delay)

    
    

    //10000/2000 = 5;
    //150 * 2000 / 10 = 30
    // 30dif => 30steps / 10s  = 3 steps/s
    // 50dif => 50steps * 2verz / 10s  = 2.5
    // 100fid => 100steps / 10s = 10 steps/s
    /*
    fading(colorStart.r, colorStart.g, colorStart.b);

    async function fading(r: number, g: number, b: number) {
      if (r == colorTo.r && g == colorTo.g && b == colorTo.b) {
        return { r, g, b };
      }
      return fading(r, g, b);
    }
    */

    return {
      message: "Fading the color!",
      object: resLight
    };
  }

}
