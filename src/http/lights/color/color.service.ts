import { BadRequestException, Injectable } from "@nestjs/common";
import { isEqual, uniq } from "lodash";
import { CustomException } from "src/exceptions/custom-exception.exception";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { OffException } from "../../../exceptions/off.exception";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";
import { UtilsService } from "../../../services/utils/utils.service";
import { BlinkLedsDto } from "./dto/blink-leds.dto";
import { CustomData, CustomPatternDto } from "./dto/custom-pattern.dto";
import { UpdateLedsDto } from "./dto/update-leds.dto";

@Injectable()
export class ColorService {
  constructor(
    private databaseService: DatabaseEspService,
    private utilsService: UtilsService,
    private tcpService: TcpService,
  ) { }

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

  async blinkColor(
    id: string,
    data: BlinkLedsDto,
  ): Promise<StandartResponse<Light>> {
    data.color = this.utilsService.makeValidHex(data.color);
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
