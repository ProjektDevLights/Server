import { Injectable, NotAcceptableException } from "@nestjs/common";
import moment from "moment";
import { NothingChangedException } from "src/exceptions/nothing-changed.exception";
import ScheduleOffDto from "src/http/lights/control/dto/schedule-off.dto";
import { CronService } from "src/services/cron/cron.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { UtilsService } from "src/services/utils/utils.service";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";

@Injectable()
export class ControlService {
  constructor(
    private databaseService: DatabaseEspService,
    private tcpService: TcpService,
    private utilsService: UtilsService,
    private cronService: CronService
  ) { }

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

  private offCallback = async (name: string) => {
    let esps: EspDocument[] = await this.databaseService.getEspsWithTag(
      name.split("-")[1],
    );

    try {
      this.tcpService.batchSendData(
        this.utilsService.genJSONforEsp({ command: "off" }),
        esps,
      );

      await this.databaseService.updateEspsWithTag(name.split("-")[1], { isOn: false });
    } catch { }
    this.cronService.deleteCron(name);
  };


  async scheduleOff(
    tag: string,
    data: ScheduleOffDto,
  ): Promise<StandartResponse<Light[]>> {
    const oldDocs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);

    const minute = data.minute;

    const date = moment().add(minute, "minutes");

    let cronPattern = `${date
      .minutes()
      .toString()} ${date.hours().toString()} * * *`;

    try {
      if (this.cronService.getCron(`off-${tag}`)) {
        this.cronService.deleteCron(`off-${tag}`);
      }
      this.cronService.addCron(
        `off-${tag}`,
        cronPattern,
        this.offCallback,
      );
    } catch {
      throw new NotAcceptableException("Something went wrong");
    }

    return {
      message: `The light will turn off in ${date.fromNow(true)}!`,
      object: DatabaseEspService.espDocsToLights(oldDocs),
    };
  }

  async deleteScheduleOffTag(tag: string): Promise<StandartResponse<any>> {
    try {
      this.cronService.getCron(`off-${tag}`);
      this.cronService.deleteCron(`off-${tag}`);
    } catch (error) {
      throw new NotAcceptableException("There is no timer set for this light");
    }
    return {
      message: "Successfully deleted timer for this light",
      object: null,
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
