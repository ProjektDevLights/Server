import { Injectable, NotAcceptableException } from "@nestjs/common";
import moment from "moment";
import { CronService } from "src/services/cron/cron.service";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { UtilsService } from "src/services/utils/utils.service";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { Light, PartialLight, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";
import ScheduleOffDto from "./dto/schedule-off.dto";

@Injectable()
export class ControlService {
  constructor(
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
    private utilsService: UtilsService,
    private cronService: CronService,
  ) {}

  async on(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (oldDoc.isOn)
      throw new NothingChangedException("The light is already on");

    /*     this.tcpService.sendData(
      this.utilsService.genJSONforEsp({ command: "on" }),
      oldDoc.ip,
    ); */

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

    /*     this.tcpService.sendData(
      this.utilsService.genJSONforEsp({ command: "off" }),
      oldDoc.ip,
    ); */

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      isOn: false,
    });

    return {
      message: "Successfully turned the light off!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  private offCallback = async (name: string) => {
    let esp: EspDocument = await this.databaseService.getEspWithId(
      name.split("-")[1],
    );

    try {
      this.tcpService.sendData(
        this.utilsService.genJSONforEsp({ command: "off" }),
        esp.ip,
      );

      await this.databaseService.updateEspWithId(esp.uuid, { isOn: false });
    } catch {}
    this.cronService.deleteCron(name);
  };

  async scheduleOff(
    id: string,
    data: ScheduleOffDto,
  ): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    const minute = data.minute;

    const date = moment().add(minute, "minutes");

    let cronPattern = `${date
      .minutes()
      .toString()} ${date.hours().toString()} * * *`;

    try {
      if (this.cronService.getCron(`off-${oldDoc.uuid}`)) {
        this.cronService.deleteCron(`off-${oldDoc.uuid}`);
      }
      this.cronService.addCron(
        `off-${oldDoc.uuid}`,
        cronPattern,
        this.offCallback,
      );
    } catch {
      throw new NotAcceptableException("Something went wrong");
    }

    return {
      message: `The light will turn off in ${date.fromNow(true)}!`,
      object: DatabaseEspService.espDocToLight(oldDoc),
    };
  }

  async deleteScheduleOff(id: string): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    try {
      this.cronService.getCron(`off-${id}`);
      this.cronService.deleteCron(`off-${id}`);
    } catch (error) {
      throw new NotAcceptableException("There is no timer set for this light");
    }
    return {
      message: "Successfully deleted timer for this light",
      object: DatabaseEspService.espDocToLight(oldDoc),
    };
  }

  async restart(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);

    this.tcpService.sendData(
      this.utilsService.genJSONforEsp({ command: "restart" }),
      doc.ip,
    );
    this.tcpService.removeConnection(doc.ip);

    return {
      message: "Restarting...",
      object: DatabaseEspService.espDocToPartialLight(doc),
    };
  }

  async reset(id: string): Promise<StandartResponse<PartialLight>> {
    const doc: EspDocument = await this.databaseService.getEspWithId(id);
    this.tcpService.sendData(
      this.utilsService.genJSONforEsp({ command: "reset" }),
      doc.ip,
    );

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
