import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { omit } from "lodash";
import { Model } from "mongoose";
import { lightProjection } from "./globals";
import { Leds, Light } from "./interfaces";
import { Esp, EspDocument } from "./schemas/esp.schema";

@Injectable()
export class UtilsService {
  constructor(@InjectModel(Esp.name) private espModel: Model<EspDocument>) {}

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
    const light: EspDocument[] = await this.espModel.find(
      { tags: { $all: [tag] } },
      lightProjection,
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
}
