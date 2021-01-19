import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { TcpService } from 'src/services/tcp/tcp.service';
import { UtilsService } from 'src/services/utils/utils.service';
import { Light, StandartResponse } from '../../../interfaces';
import { Esp, EspDocument } from '../../../schemas/esp.schema';

@Injectable()
export class GeneralService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private tcpService: TcpService,
    private utilsService: UtilsService,
    private databaseService: DatabaseEspService) { }

  async getAll(): Promise<StandartResponse<Light[]>> {
    return {
      message: "List of all lights",
      object: this.databaseService.espDocsToLights(await this.databaseService.getEsps())
    };
  }

  async get(id: string): Promise<StandartResponse<Light>> {
    return {
      message: "List of all lights",
      object: this.databaseService.espDocToLight(await this.databaseService.getEspWithId(id))
    }
  }

  async pass(id: string, data: string): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(data, doc.ip);
    return { message: "Passed data", object: this.databaseService.espDocToLight(doc) }
  }


}
