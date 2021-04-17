import { Injectable } from "@nestjs/common";
import { NothingChangedException } from "src/exceptions/nothing-changed.exception";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";

@Injectable()
export class ControlService {
  constructor(
    private databaseService: DatabaseEspService,
    private tcpService: TcpService,
  ) {}

  async onTags(tag: string): Promise<StandartResponse<Light[]>> {
    const oldDocs: EspDocument[] = await this.databaseService.getEspsWithTag(
      tag,
    );
    const newLights: Light[] = [];
    oldDocs.forEach((doc: EspDocument) => {
      if (!doc.isOn) {
        newLights.push(DatabaseEspService.espDocToLight(doc));
      }
    });
    if (newLights.length <= 0) {
      throw new NothingChangedException("All lights are already on");
    }
    this.tcpService.batchSendData(`{"command": "on"}`, oldDocs);

    const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(
      tag,
      { isOn: true },
    );

    return {
      message: `Succefully the the lights on!`,
      count: newDocs.length,
      object: DatabaseEspService.espDocsToLights(newDocs),
    };
  }

  async offTags(tag: string): Promise<StandartResponse<Light[]>> {
    const oldDocs: EspDocument[] = await this.databaseService.getEspsWithTag(
      tag,
    );
    const newLights: Light[] = [];
    oldDocs.forEach((doc: EspDocument) => {
      if (doc.isOn) {
        newLights.push(DatabaseEspService.espDocToLight(doc));
      }
    });
    if (newLights.length <= 0) {
      throw new NothingChangedException("All lights are already off");
    }

    this.tcpService.batchSendData(`{"command": "off"}`, oldDocs);

    const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(
      tag,
      { isOn: false },
    );

    return {
      message: `Successfully turned the lights off!`,
      count: newDocs.length,
      object: DatabaseEspService.espDocsToLights(newDocs),
    };
  }

  async restartWithTag(tag: string): Promise<StandartResponse<PartialLight[]>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);

    this.tcpService.batchSendData(`{"command": "restart"}`, docs);

    return {
      message: "Restarting...",
      count: docs.length,
      object: DatabaseEspService.espDocsToPartialLights(docs),
    };
  }

  async resetWithTag(tag: string): Promise<StandartResponse<PartialLight[]>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);

    this.databaseService.deleteEspsWithTag(tag);

    this.tcpService.batchSendData(`{"command": "reset"}`, docs);

    return {
      message: "Resetting...",
      count: docs.length,
      object: DatabaseEspService.espDocsToPartialLights(docs),
    };
  }
}
