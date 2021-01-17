import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { omit } from "lodash";
import { Model } from "mongoose";
import tinycolor from "tinycolor2";
import { ColorFormats } from "tinycolor2";
import { lightProjection } from "../../globals";
import { Leds, Light } from "../../interfaces";
import { Esp, EspDocument } from "../../schemas/esp.schema";
import { TcpService } from "../tcp/tcp.service";

@Injectable()
export class UtilsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private tcpService: TcpService,
    ) {}

  hexToRgb(hex: string): string {
    hex = this.makeValidHex(hex);
    let colors: string[] = [];
    switch (hex.length) {
      case 6:
        colors = hex.match(/.{1,2}/g);
        break;
      case 7:
        colors = hex.substring(1, 7).match(/.{1,2}/g);
        break;
    }
    return (
      parseInt(colors[0], 16) +
      "." +
      parseInt(colors[1], 16) +
      "." +
      parseInt(colors[2], 16)
    );
  }

  makeValidHex(hex: string): string {
    let colors: string[] = [];
    switch (hex.length) {
      case 3:
        colors = hex.split("");
        return (
          "#" +
          colors[0] +
          "" +
          colors[0] +
          "" +
          colors[1] +
          "" +
          colors[1] +
          "" +
          colors[2] +
          "" +
          colors[2] +
          ""
        );
        break;
      case 4:
        colors = hex.substring(1, 4).split("");
        return (
          "#" +
          colors[0] +
          "" +
          colors[0] +
          "" +
          colors[1] +
          "" +
          colors[1] +
          "" +
          colors[2] +
          "" +
          colors[2] +
          ""
        );
        break;
      case 6:
        colors = hex.match(/.{1,2}/g);
        return "#" + colors[0] + "" + colors[1] + "" + colors[2] + "";
        break;
      case 7:
        colors = hex.substring(1, 7).match(/.{1,2}/g);
        return "#" + colors[0] + "" + colors[1] + "" + colors[2] + "";
        break;
    }
    return "#000000";
  }

  hexArrayToRgb(colors: string[]): string {
    let rgb: string[] = [];
    colors.forEach(color => {
      rgb.push(this.hexToRgb(color));
    });
    return JSON.stringify(rgb);
  }

  makeValidHexArray(colors: string[]): string[] {
    let hex: string[] = [];
    colors.forEach(color => {
      hex.push(this.makeValidHex(color));
    });
    return hex;
  }

  async isIdValid(id: string): Promise<boolean> {
    if ((await this.espModel.find({ uuid: id }).exec()).length) return true;
    return false;
  }

  async isTagValid(tag: string): Promise<boolean> {
    if (
      (await this.espModel.find({ tags: { $all: [tag] } }).exec()).length <= 0
    )
      return false;
    return true;
  }

  isValidPattern(data: Leds) : boolean{
    if(data.colors.length > 1) {
      if(data.pattern == "plain") {
        return false;
      } else {
        return true;
      }
    } else if(data.colors.length == 1){
      if(data.pattern === "gradient") {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  async getEspsWithTag(tag: string): Promise<EspDocument[]> {
    //TODO sometimes needed without ip
    const light: EspDocument[] = await this.espModel.find(
      { tags: { $all: [tag] } },
      {__v: 0,_id: 0},
    );
    return light;
  } 

  espDocToLight(doc: EspDocument) {
    return {
      count: doc.count,
      name: doc.name,
      id: doc.uuid,
      leds: doc.leds,
      tags: doc.tags,
      isOn: doc.isOn,
    } as Light;
  }

  fading(id: string, data: { color: string, time: number, delay: number }, oldLight: EspDocument) {

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
 
    console.log({rStep,gStep,bStep})
    const runInterval = setInterval(async () => {
        if (runs <= 0) {

            this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.hexToRgb(
                tinycolor(colorTo).toHexString(),
            )}"], "pattern": "plain"}}`, oldLight.ip);

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
        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.hexToRgb(
            tinycolor(colorStart).toHexString(),
        )}"], "pattern": "plain"}}`, oldLight.ip);


        runs--;
    }, data.delay);
  }  
}
