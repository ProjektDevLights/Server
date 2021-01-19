import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { UpdateLedsDto } from '../../../http/lights/color/dto/update-leds.dto';
import { Light, StandartResponse } from '../../../interfaces';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { TcpService } from '../../../services/tcp/tcp.service';
import { UtilsService } from '../../../services/utils/utils.service';

@Injectable()
export class ColorService {

  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private utilsService: UtilsService,
    private tcpService: TcpService,
    private databaseService: DatabaseEspService
  ) { }

  async updateLedsWithTag(
    tag: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light[]>> {
    data.colors = this.utilsService.makeValidHexArray(data.colors);

    const oldDocs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);
    const on: boolean[] = await this.databaseService.getEspsWithTag(tag, true).distinct("isOn").exec();
    if (!on.every((val, i) => val === true)) throw new ServiceUnavailableException("At least one light is not on! In order to update with tag please turn them on with '/tags/{{tag}}/on'");


    const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(tag, {
      $set: {
        leds: {
          colors: data.colors,
          pattern: data.pattern
        }
      }
    });

    if (data.colors) {
      newDocs.forEach(element => {
        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(data.colors)}, "pattern": "plain"}}`, element.ip);
      });
    }
    return {
      message: "Succesfully changed the color of the light!",
      object: this.databaseService.espDocsToLights(newDocs),
    };
  }
}
