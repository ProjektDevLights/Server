import { Injectable } from "@nestjs/common";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { UtilsService } from "src/services/utils/utils.service";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";

@Injectable()
export class ControlService {
  constructor(
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
    private utilsService: UtilsService,
  ) {}

  async on(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (oldDoc.isOn)
      throw new NothingChangedException("The light is already on");

    this.tcpService.sendData(this.utilsService.genJSONforEsp({command: "on"}), oldDoc.ip);

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      isOn: true,
    });

    return {
      message: "Succesfully turned the light on!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async off(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (!oldDoc.isOn)
      throw new NothingChangedException("The light is already off");

    this.tcpService.sendData(this.utilsService.genJSONforEsp({command: "off"}), oldDoc.ip);

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      isOn: false,
    });

    return {
      message: "Successfully turned the light off!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async restart(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);

    this.tcpService.sendData(this.utilsService.genJSONforEsp({command: "restart"}), doc.ip);
    this.tcpService.removeConnection(doc.ip);

    return {
      message: "Restarting...",
      object: DatabaseEspService.espDocToPartialLight(doc),
    };
  }

  async reset(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(this.utilsService.genJSONforEsp({command: "reset"}), doc.ip);

    await this.databaseService.deleteEspWithId(id);

    return {
      message: "Resetting...",
      object: DatabaseEspService.espDocToPartialLight(doc),
    };
  }

  async delete(id: string): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.deleteEspWithId(id);

    return {
      message: "Succesfully deleted light",
      object: DatabaseEspService.espDocToLight(doc),
    };
  }
}
