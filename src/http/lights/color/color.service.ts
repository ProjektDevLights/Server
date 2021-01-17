import { BadRequestException, Injectable } from '@nestjs/common';
import { UtilsService } from '../../../services/utils/utils.service';
import { Light, StandartResponse } from '../../../interfaces';
import { UpdateLedsDto } from './dto/update-leds.dto';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import tinycolor, { ColorFormats } from 'tinycolor2';
import { TcpService } from '../../../services/tcp/tcp.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Alarm } from '../../../schemas/alarm.schema';
import { AlarmDocument } from '../../../schemas/alarm.schema';
import { OffException } from '../../../exceptions/off.exception';
import { CustomException } from '../../../exceptions/custom-exception.exception';
import { FadingLedsDto } from './dto/fading-leds.dto';
import { BlinkLedsDto } from './dto/blink-leds.dto';
import { BlinkingLedsDto } from './dto/blinking-leds.dto';
import lodash from 'lodash';

@Injectable()
export class ColorService {
    
    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private utilsService: UtilsService,
        private tcpService: TcpService
    ) {}
    

    async updateLeds(
        id: string,
        data: UpdateLedsDto,
      ): Promise<StandartResponse<Light>> {
        data.colors = this.utilsService.makeValidHexArray(data.colors);
    
        const oldLight: EspDocument = await this.espModel.findOne(
          { uuid: id },
          { __v: 0, _id: 0 },
        );
    
          if(lodash.isEqual(data.colors, oldLight.leds.colors)) {
            throw new NothingChangedException("Nothing changed");
          }
    
          if(!this.utilsService.isValidPattern(data)) {
            throw new BadRequestException("Wrong colors or pattern provided");
          }
    
          if(!oldLight.isOn) throw new OffException();
           this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
            data.colors,
          )}, "pattern": "${oldLight.leds.pattern}"}}`, oldLight.ip);
        const newLight: EspDocument = await this.espModel.findOneAndUpdate(
          { uuid: id },
          {
            leds: {
              colors: data.colors,
              pattern: data.pattern,
            },
          },
          {
            new: true,
            projection: { __v: 0, _id: 0 },
          },
        );
    
        const resLight: Light = await this.utilsService.espDocToLight(newLight);
       
        return {
          message: "Succesfully changed the color of the light!",
          object: resLight,
        };
      }

      async fadeToColor(
        id: string,
        data: FadingLedsDto,
      ): Promise<StandartResponse<Light>> {
        data.color = this.utilsService.makeValidHex(data.color);
        data.delay = data.delay ?? 1000;
        data.time = data.time ?? 5000;
        const oldLight: EspDocument = await this.espModel.findOne(
          { uuid: id },
          { __v: 0, _id: 0 },
        );
    
        if (oldLight.leds.pattern != "plain") {
          throw new CustomException("Pattern must be Plain!");
        }
        if (oldLight.leds.colors[0] === data.color) {
          throw new NothingChangedException();
        }
    
        
        let resLight: Light;
        if (data.delay < 1000 || data.time < 2000) {
         this.tcpService.sendData(`{"command": "fade", "data": {"color":"${this.utilsService.hexToRgb(
          data.color,
        )}"}"]}}`, oldLight.ip);
        } else {
    
          const resDoc = await this.espModel.findOneAndUpdate(
            { uuid: id },
            {
              leds: {
                colors: [data.color] ?? undefined,
                pattern: "fading",
              },
            },
            {
              new: true,
              projection: { __v: 0, _id: 0 },
            },
          );
          resLight = await this.utilsService.espDocToLight(resDoc);
    
          let color: string = data.color;
          let time: number = data.time;
          let delay: number = data.delay
          this.utilsService.fading(id, {color, time, delay}, oldLight);
    
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
        }
        return {
          message: "Fading the color!",
          object: resLight,
        };
      }


      async blinkColor(
        id: string,
        data: BlinkLedsDto
      ) : Promise<StandartResponse<Light>> {
        const light : EspDocument = await this.espModel.findOne({uuid: id}, {__v :0,__id: 0});
    
        if(!light.isOn) {
          throw new OffException();
        }
        try {
          this.tcpService.sendData(`{"command": "blink", "data": {"color": "${this.utilsService.hexToRgb(data.color)}", "time": ${data.time}}}`, light.ip);
        } catch (e) {
          console.log(e);
          throw new OffException();
        }
        return {
          message: "Blinking color!",
          object: light as Light,
        };
      }
    
      async blinkColorLoop(
        id: string,
        data: BlinkingLedsDto,
      ): Promise<StandartResponse<Light>> {
        let length: number = data?.colors?.length ?? 0;
    
        for (let i = 0; i < length; i++) {
          data.colors[i] = this.utilsService.makeValidHex(data.colors[i]);
        }
    
        const oldLight: EspDocument = await this.espModel.findOne(
          { uuid: id },
          { __v: 0, _id: 0 },
        );
    
        if (oldLight.leds.pattern != "plain") {
          throw new CustomException("Pattern must be Plain!");
        }
    
        const resDoc = await this.espModel.findOneAndUpdate(
          { uuid: id },
          {
            leds: {
              colors: data.colors ?? oldLight.leds.colors,
              pattern: "blinking",
            },
          },
          {
            new: true,
            projection: { __v: 0, _id: 0 },
          },
        );
        const resLight: Light = await this.utilsService.espDocToLight(resDoc);
    
        if (data.delay < 100) data.delay = 100;
        const delay = data.delay;
        let runs: number = Math.ceil(data.time / delay);
        let cIndex: number = 0;
        let blinkColor: string = "#000000";
    
        const runInterval = setInterval(() => {
          if (runs <= 0) {
    
            this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
              oldLight.leds.colors,
            )}, "pattern": "plain"}}`, oldLight.ip);
    
            this.espModel
              .updateOne(
                { uuid: id },
                {
                  leds: {
                    colors: oldLight.leds.colors,
                    pattern: oldLight.leds.pattern,
                  },
                },
                {
                  new: true,
                  projection: { __v: 0, _id: 0 },
                },
              )
              .exec();
            clearInterval(runInterval);
            return;
          }
    
          let prevColor: string = data.colors
            ? data.colors[cIndex] ?? oldLight.leds.colors[0]
            : oldLight.leds.colors[0];
          blinkColor = blinkColor == "#000000" ? prevColor : "#000000";
    
          if (blinkColor == "#000000") {
            cIndex = cIndex >= data?.colors?.length - 1 ? 0 : cIndex + 1;
          }
    
          this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
            blinkColor
          )}"], "pattern": "plain"}}`, oldLight.ip);
    
          runs--;
        }, delay);
    
        return {
          message: "Blinking colors!",
          object: resLight,
        };
      }
    
}
