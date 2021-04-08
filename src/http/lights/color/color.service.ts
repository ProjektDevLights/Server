import { BadRequestException, Injectable } from "@nestjs/common";
import { isEqual, uniq } from "lodash";
import { CustomException } from "src/exceptions/custom-exception.exception";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import tinycolor from "tinycolor2";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { OffException } from "../../../exceptions/off.exception";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";
import { UtilsService } from "../../../services/utils/utils.service";
import { BlinkLedsDto } from "./dto/blink-leds.dto";
import { BlinkingLedsDto } from "./dto/blinking-leds.dto";
import { CustomData, CustomPatternDto } from "./dto/custom-pattern.dto";
import { FadingLedsDto } from "./dto/fading-leds.dto";
import { UpdateLedsDto } from "./dto/update-leds.dto";

@Injectable()
export class ColorService {
  constructor(
    private databaseService: DatabaseEspService,
    private utilsService: UtilsService,
    private tcpService: TcpService,
  ) {}

  async updateLeds(
    id: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {
    data.colors = data.colors ?? [];

    let errors = this.utilsService.isValidPattern(data);
    if (errors?.length > 0) throw new BadRequestException(errors);

    data.colors = data.colors.length ? data.colors : ["#1DE9B6"];
    data.colors = this.utilsService.makeValidHexArray(data.colors);
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (
      isEqual(data.colors, oldDoc.leds.colors) &&
      isEqual(data.pattern, oldDoc.leds.pattern) &&
      isEqual(data.timeout, oldDoc.leds.timeout)
    )
      throw new NothingChangedException("Nothing changed");
    if (!oldDoc.isOn) throw new OffException();
    if (["waking", "blinking"].includes(oldDoc.leds.pattern))
      throw new CustomException(
        "The light is currently in a mode, where changing color is not supported",
        423,
      );
    this.tcpService.sendData(
      this.utilsService.genJSONforEsp({
        command: "leds",
        data: {
          colors: data.colors,
          pattern: data.pattern,
          timeout: data.timeout,
        },
      }),
      oldDoc.ip,
    );

    const newDoc = await this.databaseService.updateEspWithId(id, {
      leds: {
        colors: data.colors,
        pattern: data.pattern,
        timeout: data.timeout == null ? undefined : data.timeout,
      },
    });

    return {
      message: "Succesfully changed the color of the light!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async fadeToColor(
    id: string,
    data: FadingLedsDto,
  ): Promise<StandartResponse<Light>> {
    data.color = this.utilsService.makeValidHex(data.color);
    data.delay = data.delay ?? 1000;
    data.time = data.time ?? 5000;

    const oldDoc = await this.databaseService.getEspWithId(id);

    if (oldDoc.leds.pattern != "plain")
      throw new BadRequestException("Pattern must be Plain!");
    if (oldDoc.leds.colors[0] === data.color)
      throw new NothingChangedException();

    let resDoc: EspDocument;
    if (data.delay < 1000 || data.time < 2000) {
      this.tcpService.sendData(
        this.utilsService.genJSONforEsp({
          command: "fade",
          data: { color: data.color },
        }),
        oldDoc.ip,
      );

      resDoc = await this.databaseService.updateEspWithId(id, {
        leds: { colors: [data.color], pattern: "plain" },
      });
    } else {
      resDoc = await this.databaseService.updateEspWithId(id, {
        leds: {
          colors: [data.color],
          pattern: "fading",
        },
      });

      let color: string = data.color;
      let time: number = data.time;
      let delay: number = data.delay;
      this.utilsService
        .fading(
          resDoc.ip,
          tinycolor(resDoc.leds.colors[0]),
          tinycolor(color),
          time,
          delay,
        )
        .then(() => {
          this.databaseService.updateEspWithId(oldDoc.uuid, {
            leds: {
              colors: [color],
              pattern: oldDoc.leds.pattern,
            },
          });
        });
      return {
        message: "Fading the color!",
        object: DatabaseEspService.espDocToLight(resDoc),
      };
    }
  }

  async blinkColor(
    id: string,
    data: BlinkLedsDto,
  ): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);

    if (!doc.isOn) throw new OffException();
    this.tcpService.sendData(
      this.utilsService.genJSONforEsp({
        command: "blink",
        data: { color: data.color, time: data.time },
      }),
      doc.ip,
    );
    return {
      message: "Blinking color!",
      object: DatabaseEspService.espDocToLight(doc),
    };
  }

  async blinkColorLoop(
    id: string,
    data: BlinkingLedsDto,
  ): Promise<StandartResponse<Light>> {
    let length: number = data?.colors?.length ?? 0;

    //make helper method
    for (let i = 0; i < length; i++) {
      data.colors[i] = this.utilsService.makeValidHex(data.colors[i]);
    }

    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (oldDoc.leds.pattern != "plain")
      throw new BadRequestException("Pattern must be Plain!");

    const newDoc = await this.databaseService.updateEspWithId(id, {
      leds: {
        colors: data.colors ?? oldDoc.leds.colors,
        pattern: "blinking",
      },
    });

    if (data.delay < 100) data.delay = 100;
    const delay = data.delay;
    let runs: number = Math.ceil(data.time / delay);
    let cIndex: number = 0;
    let blinkColor: string = "#000000";

    const runInterval = setInterval(() => {
      if (runs <= 0) {
        this.tcpService.sendData(
          this.utilsService.genJSONforEsp({
            command: "leds",
            data: {
              colors: this.utilsService.hexArrayToRgb(oldDoc.leds.colors),
              pattern: "plain",
            },
          }),
          oldDoc.ip,
        );

        this.databaseService.updateEspWithId(id, {
          leds: {
            colors: oldDoc.leds.colors,
            pattern: oldDoc.leds.pattern,
          },
        });
        clearInterval(runInterval);
        return;
      }

      let prevColor: string = data.colors
        ? data.colors[cIndex] ?? oldDoc.leds.colors[0]
        : oldDoc.leds.colors[0];
      blinkColor = blinkColor == "#000000" ? prevColor : "#000000";

      if (blinkColor == "#000000") {
        cIndex = cIndex >= data?.colors?.length - 1 ? 0 : cIndex + 1;
      }

      this.tcpService.sendData(
        this.utilsService.genJSONforEsp({
          command: "leds",
          data: { colors: blinkColor, pattern: "plain" },
        }),
        oldDoc.ip,
      );

      runs--;
    }, delay);

    return {
      message: "Blinking colors!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async applyCustom(
    id: string,
    data: CustomPatternDto,
  ): Promise<StandartResponse<{ light: PartialLight; data: CustomData[] }>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (!oldDoc.isOn) throw new OffException();
    if (["waking", "blinking"].includes(oldDoc.leds.pattern))
      throw new CustomException(
        "The light is currently in a mode, where changing color is not supported",
        423,
      );

    let colors: string[] = [];
    data.data.forEach((customData: CustomData, index: number) => {
      colors = colors.concat(
        this.utilsService.makeValidHexArray(customData.leds),
      );
      data.data[index].leds = this.utilsService.makeValidHexArray(
        customData.leds,
      );
    });
    colors = uniq(colors);

    let sendColors: string[] = [];

    data.data.forEach((data: CustomData) => {
      for (let i = 0; i < data.repeat; i++) {
        sendColors = sendColors.concat(data.leds);
      }
    });

    if (sendColors.length > oldDoc.count)
      throw new BadRequestException(
        `The total length of Leds should not exceed ${oldDoc.count}`,
      );

    this.tcpService.sendData(
      this.utilsService.genJSONforEsp({ command: "custom", data: sendColors }),
      oldDoc.ip,
    );

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      leds: {
        colors: colors,
        pattern: "custom",
        timeout: undefined,
      },
    });

    return {
      message:
        "Succesfully applied custom Pattern. (Mind that custom patterns are not saved!)",
      object: {
        light: DatabaseEspService.espDocToPartialLight(newDoc),
        data: data.data,
      },
    };
  }
}
