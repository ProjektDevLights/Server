import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import tinycolor, { ColorFormats } from "tinycolor2";
import { Leds, Light } from "../../interfaces";
import { Esp, EspDocument } from "../../schemas/esp.schema";
import { DatabaseEspService } from "../database/esp/database-esp.service";
import { TcpService } from "../tcp/tcp.service";

@Injectable()
export class UtilsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private databaseService: DatabaseEspService,
    private tcpService: TcpService,
  ) { }

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

  isValidPattern(data: Leds): boolean {
    if (data.colors.length > 1) {
      if (data.pattern == "plain") {
        return false;
      } else {
        return true;
      }
    } else if (data.colors.length == 1) {
      if (data.pattern === "gradient") {
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
      { __v: 0, _id: 0 },
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

    console.log(colorTo)
    let colorStart: ColorFormats.RGB = tinycolor(
      oldLight.leds.colors[0],
    ).toRgb();
    console.log(colorStart)
    let rStep: number = this.generateStep(colorStart.r, colorTo.r, data.delay, data.time);
    let gStep: number = this.generateStep(colorStart.g, colorTo.g, data.delay, data.time);
    let bStep: number = this.generateStep(colorStart.b, colorTo.b, data.delay, data.time);

    let runs: number = Math.round(data.time / data.delay);

    let colorRun: ColorFormats.RGB = colorStart;
    console.log({ rStep, gStep, bStep })
    const runInterval = setInterval(async () => {
      if (runs <= 0) {

        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.hexToRgb(
          tinycolor(colorTo).toHexString(),
        )}"], "pattern": "plain"}}`, oldLight.ip);


        await this.databaseService.updateEspWithId(id, {
          leds: {
            colors: [data.color],
            pattern: oldLight.leds.pattern,
          },
        })
        clearInterval(runInterval);
        return;
      }
      colorRun.r = this.applyStep(colorRun.r, rStep, colorTo.r)
      colorRun.g = this.applyStep(colorRun.g, gStep, colorTo.g)
      colorRun.b = this.applyStep(colorRun.b, bStep, colorTo.b)
      console.log(colorRun);
      this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.hexToRgb(
        tinycolor(colorRun).toHexString(),
      )}"], "pattern": "plain"}}`, oldLight.ip);


      runs--;
    }, data.delay);
  }

  generateStep(start: number, end: number, delay: number, time: number): number {
    console.log(((start - end) * delay) / time)
    const floatStep: number = ((start - end) * delay) / time;
    if (floatStep > 0) return Math.ceil(floatStep);
    if (floatStep < 0) return Math.floor(floatStep);
    return 0;
  }

  applyStep(start: number, step: number, goal: number) {
    if (start - step < goal && step >= 0) return goal;
    if (start - step > goal && step <= 0) return goal;
    return start - step;
  }


}
