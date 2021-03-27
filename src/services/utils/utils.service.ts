import { Injectable } from "@nestjs/common";
import { Commands, COMMANDS } from "src/interfaces/commands.inteface";
import { Pattern } from "src/interfaces/patterns/pattern.type";
import tinycolor, { ColorFormats } from "tinycolor2";
import { EspCommand, Leds } from "../../interfaces";
import { EspDocument } from "../../schemas/esp.schema";
import { DatabaseAlarmService } from "../database/alarm/database-alarm.service";
import { DatabaseEspService } from "../database/esp/database-esp.service";
import { TcpService } from "../tcp/tcp.service";

@Injectable()
export class UtilsService {
  constructor(
    private databaseServiceEsp: DatabaseEspService,
    private databaseServiceAlarm: DatabaseAlarmService,
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
      case 6:
        colors = hex.match(/.{1,2}/g);
        return "#" + colors[0] + "" + colors[1] + "" + colors[2] + "";
      case 7:
        colors = hex.substring(1, 7).match(/.{1,2}/g);
        return "#" + colors[0] + "" + colors[1] + "" + colors[2] + "";
    }
    return "#000000";
  }

  hexArrayToRgb(colors: string[]): string {
    if (colors.length == 0) return "[]";
    let rgb: string[] = [];
    colors.forEach(color => {
      rgb.push(this.hexToRgb(color));
    });
    return JSON.stringify(rgb);
  }

  makeValidHexArray(colors: string[]): string[] {
    if (colors.length == 0) return [];
    let hex: string[] = [];
    colors.forEach(color => {
      hex.push(this.makeValidHex(color));
    });
    return hex;
  }

  async isIdValid(id: string): Promise<boolean> {
    if (await this.databaseServiceEsp.getEspWithId(id)) return true;
    return false;
  }

  async isTagValid(tag: string): Promise<boolean> {
    return (await this.databaseServiceEsp.getTags()).includes(tag);
  }
  async isAlarmIdValid(id: string): Promise<boolean> {
    try {
      await this.databaseServiceAlarm.getAlarmWithId(id);
    } catch {
      return false;
    }
    return true;
  }

  isValidPattern(data: Leds): boolean {
    // length > 1 => gradient
    // length == 1 => plain or runner
    // length == 0 => fading or rainbow

    switch (data.colors.length) {
      case 0: {
        switch (data.pattern) {
          case "fading": {
            return !!data.timeout;
          }
          case "rainbow": {
            return !!data.timeout;
          }
          default:
            return false;
        }
      }
      case 1: {
        return (
          (data.pattern === "plain" && !data.timeout) ||
          (data.pattern === "runner" && !!data.timeout)
        );
      }
      case 2: {
        return data.pattern === "gradient" && !data.timeout;
      }
      default:
        return false;
    }
  }

  fading(
    id: string,
    data: { color: string; time: number; delay: number },
    oldLight: EspDocument,
    callback?: Function,
  ): NodeJS.Timeout {
    let colorTo: ColorFormats.RGB = tinycolor(data.color).toRgb();

    //console.log(colorTo);
    let colorStart: ColorFormats.RGB = tinycolor(
      oldLight.leds.colors[0],
    ).toRgb();
    //console.log(colorStart);
    let rStep: number = this.generateStep(
      colorStart.r,
      colorTo.r,
      data.delay,
      data.time,
    );
    let gStep: number = this.generateStep(
      colorStart.g,
      colorTo.g,
      data.delay,
      data.time,
    );
    let bStep: number = this.generateStep(
      colorStart.b,
      colorTo.b,
      data.delay,
      data.time,
    );

    let runs: number = Math.round(data.time / data.delay);

    let colorRun: ColorFormats.RGB = colorStart;
    const runInterval = setInterval(async () => {
      if (runs <= 0) {
        callback();
        clearInterval(runInterval);
        return;
      }
      colorRun.r = this.applyStep(colorRun.r, rStep, colorTo.r);
      colorRun.g = this.applyStep(colorRun.g, gStep, colorTo.g);
      colorRun.b = this.applyStep(colorRun.b, bStep, colorTo.b);
      this.tcpService.sendData(
        this.genJSONforEsp({
          command: "leds",
          data: {
            colors: [tinycolor(colorRun).toHexString()],
            pattern: "plain",
          },
        }),
        oldLight.ip,
      );

      runs--;
    }, data.delay);
    return runInterval;
  }

  generateStep(
    start: number,
    end: number,
    delay: number,
    time: number,
  ): number {
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

  genJSONforEsp(input: EspCommand): string {

    if (input.data?.colors !== undefined) {
      input.data.colors = this.hexArrayToRgb(input.data.colors);
    }
    if (input.data?.color !== undefined) {
      input.data.color = this.hexToRgb(input.data.colors);
    }
    //matches \" "[ --> takes last character
    return JSON.stringify(input)
      .replace(/(\"\[)|(\\\")/g, (match: string): string => {
        return match.substring(match.length - 1);
        //matches ]" --> takes first character
      })
      .replace(/\]\"/g, (match: string): string => {
        return match.charAt(0);
      });
  }
}
