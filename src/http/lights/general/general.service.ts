import { Injectable } from "@nestjs/common";
import { map, sortBy } from "lodash";
import { AlarmDocument } from "src/schemas/alarm.schema";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { TcpService } from "src/services/tcp/tcp.service";
import { EspUtilsService } from "src/services/utils/esp/esp.service";
import { Alarm, Light, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";

@Injectable()
export class GeneralService {
  constructor(
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
    private alarmDatabaseService: DatabaseAlarmService,
    private espUtilsService: EspUtilsService,
  ) {}

  async getAll(): Promise<StandartResponse<Light[]>> {
    let esps: Light[] = DatabaseEspService.espDocsToLights(
      await this.databaseService.getEsps(),
    );
    return {
      message: "List of all lights",
      count: esps.length,
      object: sortBy(esps, "position"),
    };
  }

  async get(id: string): Promise<StandartResponse<Light>> {
    return {
      message: "Light with Id:" + id,
      object: DatabaseEspService.espDocToLight(
        await this.databaseService.getEspWithId(id),
      ),
    };
  }

  async getLightAlarms(id: string): Promise<StandartResponse<Alarm[]>> {
    const allDocs = await this.alarmDatabaseService.getAlarms();

    const docs: AlarmDocument[] = [];

    allDocs.forEach((doc: AlarmDocument) => {
      let uuids = map(doc.esps, "uuid");
      if (uuids.includes(id)) docs.push(doc);
    });

    return {
      message: "List of alarms this light have",
      count: docs.length,
      object: DatabaseAlarmService.alarmDocsToAlarm(docs),
    };
  }

  async pass(id: string, data: string): Promise<StandartResponse<Light>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(data, doc.ip);
    return {
      message: "Succesfully passed data!",
      object: DatabaseEspService.espDocToLight(doc),
    };
  }

  async reposition(
    id: string,
    pos: number,
  ): Promise<StandartResponse<Light[]>> {
    await this.espUtilsService.repositionESP(id, pos);
    const docs = await this.databaseService.getEsps();
    return {
      message: "Succesfulley repositioned light!",
      object: DatabaseEspService.espDocsToLights(docs),
    };
  }
}
