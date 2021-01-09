import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as child_process from "child_process";
import { isEqual } from "lodash";
import { Model } from "mongoose";
import { CustomException } from "src/exceptions/custom-exception.exception";
import { NothingChangedException } from "src/exceptions/nothing-changed.exception";
import { OffException } from "src/exceptions/off.exception";
import { StandartResponse } from "src/interfaces";
import { Alarm, AlarmDocument } from "src/schemas/alarm.schema";
import { UtilsService } from "src/utils.service";
import { ColorFormats } from "tinycolor2";
import Light from "../interfaces/light.interface";
import { Esp, EspDocument } from "../schemas/esp.schema";
import { BlinkLedsDto } from "./dto/blink-leds.dto";
import { BlinkingLedsDto } from "./dto/blinking-leds.dto";
import { FadingLedsDto } from "./dto/fading-leds.dto";
import { UpdateLedsDto } from "./dto/update-leds.dto";
import { AlarmDto } from "./dto/alarm.dto"
var tinycolor = require("tinycolor2");

@Injectable()
export class ColorsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    @InjectModel(Alarm.name) private alarmModel: Model<AlarmDocument>,
    private utilsService: UtilsService,
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

      if(data.colors == oldLight.leds.colors) {
        throw new NothingChangedException("Nothing changed");
      }

      if(!this.utilsService.isValidPattern(data)) {
        throw new BadRequestException("Wrong colors or pattern provided");
      }

      if(!oldLight.isOn) throw new OffException();

     try {
        child_process.execSync(
          `echo '{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
            data.colors,
          )}, "pattern": "${oldLight.leds.pattern}"}}' | nc ${
            oldLight.ip
          } 2389 -w 5`,
        );
     } catch {
       throw new OffException();
     }
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

    if(!on.every((val, i) => val === true)) throw new OffException("At least one light is not on! In order to update with tag please turn them on with '/tags/{{tag}}/on'");
   
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
            `echo '{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}' | nc ${element.ip} 2389 -w 5`,
          );
        });
      } catch (err) {
        throw new ServiceUnavailableException(
          "At least one light is not on! In order to update with tag please turn them on with '/tags/{{tag}}/on'",
        );
      }
    }
    return {
      message: "Succesfully changed the color of the light!",
      object: resLights,
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
      throw new CustomException("Pattern must be Plain!", 400);
    }
    if (oldLight.leds.colors[0] === data.color) {
      throw new NothingChangedException();
    }

    
    let resLight: Light;
    if (data.delay < 1000 || data.time < 2000) {
      try {
        child_process.execSync(
          `echo '{"command": "fade", "data": {"color":"${this.utilsService.hexToRgb(
            data.color,
          )}"}"]}}' | nc ${oldLight.ip} 2389 -w 5`,
        );
      } catch (error) {
        throw new ServiceUnavailableException(
          "The Light is not plugged in or started yet",
        );
      }
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
      this.fading(id, {color, time, delay}, oldLight);

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

  fading(id: string, data: {color: string, time: number, delay: number}, oldLight: EspDocument){
    
      let colorTo: ColorFormats.RGB = tinycolor(data.color).toRgb();

      let colorStart: ColorFormats.RGB = tinycolor(
        oldLight.leds.colors[0],
      ).toRgb();

      let rStep: number = Math.ceil(
        ((colorStart.r - colorTo.r) * data.delay) / data.time,
      ); // 100 100/30 => 10/3 werte/step //100 steps => fertig nach 100
      let gStep: number = Math.ceil(
        ((colorStart.g - colorTo.g) * data.delay) / data.time,
      ); // 50 50/30 => 5/3 werte/step //50 => fertig nach 50
      let bStep: number = Math.ceil(
        ((colorStart.b - colorTo.b) * data.delay) / data.time,
      ); // 30 => 30steps 1000s  // 30 => 30
      let runs: number = Math.ceil(data.time / data.delay);
      const runInterval = setInterval(async () => {
        if (runs <= 0) {
          try {
            child_process.execSync(
              `echo '{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
                tinycolor(colorTo).toHexString(),
              )}"], "pattern": "plain"}}' | nc ${oldLight.ip} 2389 -w 5`,
            );
          } catch (error) {
            throw new ServiceUnavailableException(
              "The Light is not plugged in or started yet",
            );
          }
          await this.espModel.updateOne(
            { uuid: id },
            {
              leds: {
                colors: [data.color] ?? undefined,
                pattern: oldLight.leds.pattern,
              },
            },
            {
              new: true,
              projection: { __v: 0, _id: 0 },
            },
          );
          clearInterval(runInterval);
          return;
        }
        colorStart.r =
          colorStart.r - rStep < colorTo.r && rStep >= 0
            ? colorTo.r
            : colorStart.r - rStep > colorTo.r && rStep <= 0
            ? colorTo.r
            : colorStart.r - rStep;
        colorStart.g =
          colorStart.g - gStep < colorTo.g && gStep >= 0
            ? colorTo.g
            : colorStart.g - gStep > colorTo.g && gStep <= 0
            ? colorTo.g
            : colorStart.g - gStep;
        colorStart.b =
          colorStart.b - bStep < colorTo.b && bStep >= 0
            ? colorTo.b
            : colorStart.b - bStep > colorTo.b && bStep <= 0
            ? colorTo.b
            : colorStart.b - bStep;
        try {
          child_process.execSync(
            `echo '{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
              tinycolor(colorStart).toHexString(),
            )}"], "pattern": "plain"}}' | nc ${oldLight.ip} 2389 -w 5`,
          );
        } catch (error) {
          throw new ServiceUnavailableException(
            "The Light is not plugged in or started yet",
          );
        }
        runs--;
    }, data.delay);
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
          child_process.execSync(
      `echo '{"command": "blink", "data": {"color": "${this.utilsService.hexToRgb(data.color)}", "time": ${data.time}}}' | nc ${light.ip} 2389 -w 5`,
    );
    
    } catch {
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
      throw new CustomException("Pattern must be Plain!", 400);
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
        try {
          child_process.execSync(
            `echo '{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
              oldLight.leds.colors,
            )}, "pattern": "plain"}}' | nc ${oldLight.ip} 2389 -w 5`,
          );
        } catch {}
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
      try {
        child_process.execSync(
          `echo '{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
            blinkColor,
          )}"], "pattern": "plain"}}' | nc ${oldLight.ip} 2389 -w 5`,
        );
      } catch {}

      runs--;
    }, delay);

    return {
      message: "Blinking colors!",
      object: resLight,
    };
  }

  async scheduleAlarm(
    data: AlarmDto
  ): Promise<StandartResponse<Alarm>> {

    const espIds = await this.espModel.find({"uuid": {"$in": data.ids} }).distinct("_id").exec();
    var alarm = new this.alarmModel();
    alarm.date = data.date;
    alarm.color = data.color ?? "#ff0000";
    alarm.days = data.days ?? [];
    alarm.repeat = data.repeat ?? 0;
    alarm.esps.push(...espIds);
    console.log(alarm.esps);
    alarm = await alarm.save();
    //console.log(alarm);

    console.log((await this.alarmModel.find({_id: alarm.id}, {_id: 0, __v: 0}).populate("esps", {_id: 0, uuid: 1, name: 1}).exec())[0])

    
/*    await this.alarmModel.create({
      date: data.date,
      days: data.days ?? [],
      repeat: data.repeat ?? 0,
      esps: esps,
    }) */

/*     const oldLight: EspDocument = await this.espModel.findOne(
      { uuid: id },
      { __v: 0, _id: 0 },
    );

    const newLight: EspDocument = await this.espModel.findOneAndUpdate( ALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARM
      {uuid: id},
      {leds: {
        colors: oldLight.leds.colors,
        pattern : "waking"
      }}
    ) */
/* 
    let color: string = oldLight.leds.colors[0];
    let time: number = data.time ?? 300000;
    let delay: number = data.delay ?? 500;
    this.fading(id, {color, time, delay}, oldLight); */

    return {message: "Succesfully scheduled alarm!", object: (await this.alarmModel.find({_id: alarm.id}, {_id: 0, __v: 0}).populate("esps", {_id: 0, uuid: 1, name: 1}).exec())[0]};
  }
}
