import { Injectable } from "@nestjs/common";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { TcpService } from "src/services/tcp/tcp.service";
import { Light, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";

@Injectable()
export class GeneralService {
  constructor(
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
  ) {}

  async getAll(): Promise<StandartResponse<Light[]>> {
    return {
      message: "List of all lights",
      object: this.databaseService.espDocsToLights(
        await this.databaseService.getEsps(),
      ),
    };
  }

  async get(id: string): Promise<StandartResponse<Light>> {
    return {
      message: "Light with Id " + id,
      object: this.databaseService.espDocToLight(
        await this.databaseService.getEspWithId(id),
      ),
    };
  }

  async pass(id: string, data: string): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(data, doc.ip);
    return {
      message: "Passed data",
      object: this.databaseService.espDocToLight(doc),
    };
  }
}
