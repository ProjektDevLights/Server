import { Injectable } from "@nestjs/common";
import { isArray } from "lodash";
import tinycolor, { ColorFormats } from "tinycolor2";
import { EspCommand, Leds } from "../../interfaces";
import { DatabaseAlarmService } from "../database/alarm/database-alarm.service";
import { DatabaseEspService } from "../database/esp/database-esp.service";
import { TcpService } from "../tcp/tcp.service";

export type Steps = {
  rStep: number;
  gStep: number;
  bStep: number;
};
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
    if (await this.databaseServiceAlarm.getAlarmWithId(id)) return true;
    return false;
  }

  isValidPattern(data: Leds): string | string[] | undefined {
    // length > 1 => gradient
    // length == 1 => plain or runner
    // length == 0 => fading or rainbow
    const errors: string[] = [];

    console.log();

    switch (data.pattern) {
      case "plain":
        data.colors.length !== 1
          ? errors.push(
              "colors should be of length 1, when using pattern 'plain'",
            )
          : undefined;
        data.timeout
          ? errors.push("timeout should be empty, when using pattern 'plain'")
          : undefined;
        break;
      case "gradient":
        data.colors.length !== 2
          ? errors.push(
              "colors should be of length 2, when using pattern 'gradient'",
            )
          : undefined;
        data.timeout
          ? errors.push(
              "timeout should be empty, when using pattern 'gradient'",
            )
          : undefined;
        break;
      case "runner":
        data.colors.length !== 1
          ? errors.push(
              "colors should be of length 1, when using pattern 'runner'",
            )
          : undefined;
        !data.timeout
          ? errors.push(
              "timeout must not be empty, when using pattern 'runner'",
            )
          : undefined;
        break;
      case "rainbow":
        data.colors.length !== 0
          ? errors.push("colors should be empty, when using pattern 'rainbow'")
          : undefined;
        !data.timeout
          ? errors.push(
              "timeout must not be empty, when using pattern 'rainbow'",
            )
          : undefined;
        break;
      case "fading":
        data.colors.length !== 0
          ? errors.push(
              "colors should be of length 0, when using pattern 'fading'",
            )
          : undefined;
        !data.timeout
          ? errors.push(
              "timeout must not be empty, when using pattern 'fading'",
            )
          : undefined;
        break;
      default:
        errors.push("Pattern must not be empty");
    }
    return errors.length > 0
      ? errors.length > 1
        ? errors
        : errors[0]
      : undefined;
  }

  async fading(
    ip: string,
    from: tinycolor.Instance,
    to: tinycolor.Instance,
    time: number = 60 * 1000,
    delay: number = 5 * 1000,
  ) {
    let steps: Steps = this.generateSteps(
      from.toRgb(),
      to.toRgb(),
      delay,
      time,
    );
    let runs: number = Math.round(time / delay);
    let colorRun: ColorFormats.RGB = from.toRgb();

    //loop color setting

    for (let i = 0; i < runs; i++) {
      colorRun.r = this.applyStep(colorRun.r, steps.rStep, to.toRgb().r);
      colorRun.g = this.applyStep(colorRun.g, steps.gStep, to.toRgb().g);
      colorRun.b = this.applyStep(colorRun.b, steps.bStep, to.toRgb().b);
      this.tcpService.sendData(
        this.genJSONforEsp({
          command: "leds",
          data: {
            colors: [tinycolor(colorRun).toHexString()],
            pattern: "plain",
          },
        }),
        ip,
      );
      await this.delay(delay);
      console.log(
        this.genJSONforEsp({
          command: "leds",
          data: {
            colors: [tinycolor(colorRun).toHexString()],
            pattern: "plain",
          },
        }),
      );
    }
  }

  generateSteps(
    start: ColorFormats.RGB,
    end: ColorFormats.RGB,
    delay: number,
    time: number,
  ): { rStep: number; gStep: number; bStep: number } {
    let steps: { rStep: number; gStep: number; bStep: number } = {
      rStep: 0,
      gStep: 0,
      bStep: 0,
    };

    const floatStepR: number = ((start.r - end.r) * delay) / time;
    console.log(floatStepR);
    if (floatStepR > 0) steps.rStep = Math.ceil(floatStepR);
    if (floatStepR < 0) steps.rStep = Math.floor(floatStepR);

    const floatStepG: number = ((start.g - end.g) * delay) / time;
    console.log(floatStepG);
    if (floatStepG > 0) steps.gStep = Math.ceil(floatStepG);
    if (floatStepG < 0) steps.gStep = Math.floor(floatStepG);

    const floatStepB: number = ((start.b - end.b) * delay) / time;
    console.log(floatStepB);
    if (floatStepB > 0) steps.bStep = Math.ceil(floatStepB);
    if (floatStepB < 0) steps.bStep = Math.floor(floatStepB);

    return steps;
  }

  applyStep(start: number, step: number, goal: number): number {
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
    if (isArray(input.data)) {
      input.data = this.hexArrayToRgb(input.data);
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

  delay = ms => new Promise(resolve => setTimeout(resolve, ms));
}
