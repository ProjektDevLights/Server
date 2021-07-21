import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { every, map, min, uniq } from "lodash";
import { NothingChangedException } from "src/exceptions/nothing-changed.exception";
import { BlinkLedsDto } from "src/http/lights/color/dto/blink-leds.dto";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { UpdateLedsDto } from "../../../http/lights/color/dto/update-leds.dto";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";
import { UtilsService } from "../../../services/utils/utils.service";
import {
  CustomData,
  CustomPatternDto,
} from "../../lights/color/dto/custom-pattern.dto";

@Injectable()
export class ColorService {
  constructor(
    private utilsService: UtilsService,
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
  ) {}

  async updateLedsWithTag(
    tag: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    data.colors = data.colors ?? [];
    let errors = this.utilsService.isValidPattern(data);
    if (errors?.length > 0) throw new BadRequestException(errors);

    data.colors = data.colors.length ? data.colors : ["#1DE9B6"];
    data.colors = this.utilsService.makeValidHexArray(data.colors);

    const on: boolean[] = await this.databaseService
      .getEspsWithTag(tag, true)
      .distinct("isOn")
      .exec();
    if (!on.every((val, i) => val === true))
      throw new ServiceUnavailableException(
        "At least one light is not on! In order to update with tag please turn them on with '/tags/:tag/on'",
      );

    this.tcpService.batchSendData(
      this.utilsService.genJSONforEsp({
        command: "leds",
        data: {
          colors: data.colors,
          pattern: data.pattern,
          timeout: data.timeout,
        },
      }),
      await this.databaseService.getEspsWithTag(tag),
    );

    const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(
      tag,
      {
        $set: {
          leds: {
            colors: data.colors,
            pattern: data.pattern,
            timeout: data.timeout ?? undefined,
          },
        },
      },
    );

    return {
      message: "Succesfully changed the color of the lights!",
      count: newDocs.length,
      object: DatabaseEspService.espDocsToLights(newDocs),
    };
  }

  async blink(
    tag: string,
    data: BlinkLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);
    const areOn: boolean[] = [];
    // mit absich nicht this.databaseService.getEspsWithTag(tag, true).distinct("isOn").exec();
    //da die ca 20-30ms schneller ist
    docs.forEach((doc: EspDocument) => {
      areOn.push(doc.isOn);
    });

    if (!areOn.every((val, i) => val === true))
      throw new ServiceUnavailableException(
        "At least one light is not on! In order to update with tag please turn them on with '/tags/:tag/on'",
      );

    this.tcpService.batchSendData(
      this.utilsService.genJSONforEsp({
        command: "blink",
        data: {
          color: data.color,
          time: data.time,
        },
      }),
      docs,
    );
    return {
      message: "Blinking color!",
      count: docs.length,
      object: DatabaseEspService.espDocsToLights(docs),
    };
  }

  async applyCustom(
    tag: string,
    data: CustomPatternDto,
  ): Promise<StandartResponse<{ lights: PartialLight[]; data: CustomData[] }>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);

    const areOn: boolean[] = [];
    // mit absich nicht this.databaseService.getEspsWithTag(tag, true).distinct("isOn").exec();
    //da die ca 20-30ms schneller ist
    docs.forEach((doc: EspDocument) => {
      areOn.push(doc.isOn);
    });

    if (areOn.every(val => !val))
      throw new ServiceUnavailableException(
        "All lights with the tag are off! In order to change this turn them on with '/tags/:tag/on'",
      );

    let colors: string[] = [];
    data.data.forEach((customData: CustomData, index: number) => {
      colors = colors.concat(customData.leds);
      data.data[index].leds = this.utilsService.makeValidHexArray(
        customData.leds,
      );
    });

    const customSequences = map(docs, (doc: EspDocument) =>
      JSON.stringify(doc.custom_sequence),
    );
    if (every(customSequences, val => val === JSON.stringify(data.data)))
      throw new NothingChangedException();
    colors = this.utilsService.makeValidHexArray(colors);
    colors = uniq(colors);
    let sendColors: string[] = [];
    data.data.forEach((data: CustomData) => {
      for (let i = 0; i < data.repeat; i++) {
        sendColors = sendColors.concat(data.leds);
      }
    });

    let errors: number[] = [];
    docs.forEach((doc: EspDocument) => {
      if (sendColors.length > doc.count) errors.push(doc.count);
    });

    if (errors.length > 0)
      throw new BadRequestException(
        `The total length of Leds should not exceed ${min(errors)}`,
      );

    this.tcpService.batchSendData(
      this.utilsService.genJSONforEsp({ command: "custom", data: sendColors }),
      docs,
    );

    const newDocs = await this.databaseService.updateEspsWithTag(tag, {
      $set: {
        leds: {
          colors: colors,
          pattern: "custom",
          timeout: undefined,
        },
      },
      custom_sequence: data.data,
    });

    return {
      message:
        "Succesfully applied cutom Pattern. (Mind that custom patterns are not saved!)",
      object: {
        lights: DatabaseEspService.espDocsToPartialLights(newDocs),
        data: data.data,
      },
    };
  }
}
