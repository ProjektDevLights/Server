import { Injectable } from "@nestjs/common";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";

@Injectable()
export class ControlService {
  constructor(
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
  ) {}

  async on(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (oldDoc.isOn)
      throw new NothingChangedException("The light is already on");

    this.tcpService.sendData(`{"command": "on"}`, oldDoc.ip);

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      isOn: true,
    });

    return {
      message: "Succesfully turned the light on!",
      object: this.databaseService.espDocToLight(newDoc),
    };
  }

  async off(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (!oldDoc.isOn)
      throw new NothingChangedException("The light is already off");

    this.tcpService.sendData(`{"command": "off"}`, oldDoc.ip);

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      isOn: false,
    });

    return {
      message: "Successfully turned the light off!",
      object: this.databaseService.espDocToLight(newDoc),
    };
  }

  async restart(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);

    this.tcpService.sendData(`{"command": "restart"}`, doc.ip);
    this.tcpService.removeConnection(doc.ip);

    return {
      message: "Restarting...",
      object: this.databaseService.espDocToPartialLight(doc),
    };
  }

  async reset(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(`{"command": "reset"}`, doc.ip);

    await this.databaseService.deleteEspWithId(id);

    return {
      message: "Resetting...",
      object: this.databaseService.espDocToPartialLight(doc),
    };
  }

  async delete(id: string): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.deleteEspWithId(id);

    return {
      message: "Resetting...",
      object: this.databaseService.espDocToLight(doc),
    };
  }
}
