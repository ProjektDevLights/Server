import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { BlinkLedsDto } from 'src/http/lights/color/dto/blink-leds.dto';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { UpdateLedsDto } from '../../../http/lights/color/dto/update-leds.dto';
import { Light, StandartResponse } from '../../../interfaces';
import { EspDocument } from '../../../schemas/esp.schema';
import { TcpService } from '../../../services/tcp/tcp.service';
import { UtilsService } from '../../../services/utils/utils.service';

@Injectable()
export class ColorService {

  constructor(
    private utilsService: UtilsService,
    private tcpService: TcpService,
    private databaseService: DatabaseEspService
  ) { }

  async updateLedsWithTag(
    tag: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    data.colors = this.utilsService.makeValidHexArray(data.colors);

    const on: boolean[] = await this.databaseService.getEspsWithTag(tag, true).distinct("isOn").exec();
    if (!on.every((val, i) => val === true)) throw new ServiceUnavailableException("At least one light is not on! In order to update with tag please turn them on with '/tags/:tag/on'");

    const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(tag, {
      $set: {
        leds: {
          colors: data.colors,
          pattern: data.pattern,
          timeout: data.timeout ?? undefined,
        }
      }
    });
    this.tcpService.batchSendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
      data.colors,
    )}, "pattern": "${data.pattern}"`, newDocs);
    return {
      message: "Succesfully changed the color of the light!",
      count: newDocs.length,
      object: DatabaseEspService.espDocsToLights(newDocs),
    };
  }

  async blink(tag: string, data: BlinkLedsDto): Promise<StandartResponse<Light[]>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);
    const areOn: boolean[] = [];
    // mit absich nicht this.databaseService.getEspsWithTag(tag, true).distinct("isOn").exec();
    //da die ca 20-30ms schneller ist
    docs.forEach((doc: EspDocument) => {
      areOn.push(doc.isOn);
    })

    if (!areOn.every((val, i) => val === true)) throw new ServiceUnavailableException("At least one light is not on! In order to update with tag please turn them on with '/tags/:tag/on'");

    this.tcpService.batchSendData(JSON.stringify({
      command: "blink",
      data: {
        color: this.utilsService.hexToRgb(data.color),
        time: data.time
      }
    }
    ), docs)
    return {
      message: "Blinking color!",
      count: docs.length,
      object: DatabaseEspService.espDocsToLights(docs),
    };
  }
}
