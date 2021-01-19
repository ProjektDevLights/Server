import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isEqual } from 'lodash';
import { Model } from 'mongoose';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { OffException } from '../../../exceptions/off.exception';
import { lightProjection } from '../../../globals';
import { Light, StandartResponse } from '../../../interfaces';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { TcpService } from '../../../services/tcp/tcp.service';
import { UtilsService } from '../../../services/utils/utils.service';
import UpdateTagsDto from './dto/update-tags.dto';
import UpdateInfoDto from './dto/update.dto';

@Injectable()
export class SettingsService {

  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private utilsService: UtilsService,
    private tcpService: TcpService,
    private databaseService: DatabaseEspService
  ) { }

  async update(
    id: string,
    data: UpdateInfoDto,
  ): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);
    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, data);
    if (isEqual(oldDoc, newDoc)) {
      throw new NothingChangedException("No changes were made");
    }
    return { message: "Succesfully updatet Light!", object: this.databaseService.espDocToLight(newDoc) };
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
    this.tcpService.sendData(`{"command": "brightness", "data": "${brightness}"}`, oldDoc.ip);
    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, { brightness: brightness });

    return {
      message: "Succesfully updated Lights brightness",
      object: this.utilsService.espDocToLight(newDoc)
    };
  }

  async count(id: string, count: number): Promise<StandartResponse<Light>> {
    const oldDoc: EspDocument = await this.espModel
      .findOne({ uuid: id })
      .exec();
    if (oldDoc.count == count) {
      throw new NothingChangedException();
    }

    if (!oldDoc.isOn) throw new OffException();

    this.tcpService.sendData(`{"command": "count", "data": "${count}"}`, oldDoc.ip);
    const newDoc: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { count: count },
        {
          projection: lightProjection,
          new: true,
        },
      )
      .exec();

    const newLight: Light = this.utilsService.espDocToLight(newDoc);
    return { message: "Succesfully updated LED count", object: newLight };
  }

  async addTags(
    id: string,
    data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    const oldTags: string[] = (await this.databaseService.getEspWithId(id)).tags;

    const newTags: string[] = [];

    data.tags.forEach((tag: string) => {
      if (!oldTags.includes(tag)) {
        newTags.push(tag);
      }
    });

    if (!newTags.length) {
      throw new NothingChangedException("Tag(s) already added to Light");
    }

    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, { tags: [...newTags, ...oldTags] });

    return {
      message: `Succesfully added the following tags: ${newTags}!`,
      object: this.databaseService.espDocToLight(newDoc),
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

    if (isEqual(oldDoc.tags, newTags)) throw new NothingChangedException("No Tag was removed!");


    const newDoc: EspDocument = await this.databaseService.updateEspWithId(id, { tags: newTags });
    return {
      message: `Succesfully removed the following tags: ${remTags}!`,
      object: this.databaseService.espDocToLight(newDoc),
    };
  }

}
