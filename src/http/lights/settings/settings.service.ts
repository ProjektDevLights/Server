import { Injectable } from "@nestjs/common";
import { isEqual } from "lodash";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { OffException } from "../../../exceptions/off.exception";
import { Light, StandartResponse } from "../../../interfaces";
import { EspDocument } from "../../../schemas/esp.schema";
import { TcpService } from "../../../services/tcp/tcp.service";
import { UtilsService } from "../../../services/utils/utils.service";
import UpdateTagsDto from "./dto/update-tags.dto";
import UpdateInfoDto from "./dto/update.dto";

@Injectable()
export class SettingsService {
  constructor(
    private utilsService: UtilsService,
    private tcpService: TcpService,
    private databaseService: DatabaseEspService,
  ) {}

  async update(
    id: string,
    data: UpdateInfoDto,
  ): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);
    const newDoc: EspDocument = await this.databaseService.updateEspWithId(
      id,
      data,
    );
    if (isEqual(oldDoc, newDoc)) {
      throw new NothingChangedException("No changes were made");
    }
    return {
      message: "Succesfully updatet Light!",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async setBrightness(
    id: string,
    brightness: number,
  ): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (oldDoc.brightness == brightness) {
      throw new NothingChangedException();
    }

    if (!oldDoc.isOn) throw new OffException();
    this.tcpService.sendData(
      `{"command": "brightness", "data": "${brightness}"}`,
      oldDoc.ip,
    );
    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      brightness: brightness,
    });

    return {
      message: "Succesfully updated Lights brightness",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async count(id: string, count: number): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);
    if (oldDoc.count == count) {
      throw new NothingChangedException();
    }

    if (!oldDoc.isOn) throw new OffException();

    this.tcpService.sendData(
      `{"command": "count", "data": "${count}"}`,
      oldDoc.ip,
    );

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      count: count,
    });
    return {
      message: "Succesfully updated LED count",
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async addTags(
    id: string,
    data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    const oldTags: string[] = (await this.databaseService.getEspWithId(id))
      .tags;

    const newTags: string[] = [];

    data.tags.forEach((tag: string) => {
      if (!oldTags.includes(tag)) {
        newTags.push(tag);
      }
    });

    if (!newTags.length) {
      throw new NothingChangedException("Tag(s) already added to Light");
    }

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      tags: [...newTags, ...oldTags],
    });

    return {
      message: `Succesfully added the following tags: ${newTags}!`,
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }

  async removeTags(
    id: string,
    data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);
    const oldTags: string[] = [...oldDoc.tags];

    const newTags: string[] = [];
    const remTags: string[] = [];

    oldTags.forEach((tag: string) => {
      if (!data.tags.includes(tag)) {
        newTags.push(tag);
      } else {
        remTags.push(tag);
      }
    });

    if (isEqual(oldDoc.tags, newTags))
      throw new NothingChangedException("No Tag was removed!");

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, {
      tags: newTags,
    });
    return {
      message: `Succesfully removed the following tags: ${remTags}!`,
      object: DatabaseEspService.espDocToLight(newDoc),
    };
  }
}
