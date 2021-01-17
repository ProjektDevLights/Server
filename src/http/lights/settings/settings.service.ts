import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, StandartResponse } from '../../../interfaces';
import { UtilsService } from '../../../services/utils/utils.service';
import { lightProjection } from '../../../globals';
import UpdateInfoDto from './dto/update.dto';
import { isEqual } from 'lodash';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { OffException } from '../../../exceptions/off.exception';
import { TcpService } from '../../../services/tcp/tcp.service';
import UpdateTagsDto from './dto/update-tags.dto';

@Injectable()
export class SettingsService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private utilsService: UtilsService,
        private tcpService: TcpService
    ) { }

    async update(
        id: string,
        data: UpdateInfoDto,
      ): Promise<StandartResponse<Light>> {
        const oldLight: Light = (await this.espModel
          .findOne({ uuid: id }, lightProjection)
          .exec()) as Light;
        const newLight: Light = (await this.espModel
          .findOneAndUpdate({ uuid: id }, data, {
            new: true,
            projection: lightProjection,
          })
          .exec()) as Light;
        if (isEqual(oldLight, newLight)) {
          throw new NothingChangedException("No changes were made");
        }
        return { message: "Succesfully updatet Light!", object: newLight };
    }

    async getWithTag(tag: string): Promise<StandartResponse<Light[]>> {
      const lights: EspDocument[] = await this.espModel.find(
        { tags: { $all: [tag] } },
        lightProjection,
      );
      return { message: `Lights with tag ${tag}!`, object: lights as Light[] };
    }

    async setBrightness(
      id: string,
      brightness: number,
    ): Promise<
      StandartResponse<Light>
    > {
      const oldDoc: EspDocument = await this.espModel
        .findOne(
          { uuid: id },
          { __v: 0, _id: 0 }
        )
        .exec();
  
      if (oldDoc.brightness == brightness) {
        throw new NothingChangedException();
      }
  
    if(!oldDoc.isOn) throw new OffException();
      this.tcpService.sendData(`{"command": "brightness", "data": "${brightness}"}`, oldDoc.ip);
      const newDoc: EspDocument = await this.espModel
        .findOneAndUpdate(
          { uuid: id },
          { brightness: brightness },
          {
            projection: { __v: 0, _id: 0 },
          },
        )
        .exec();
  
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
  
      if(!oldDoc.isOn) throw new OffException();
  
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
      const oldTags: string[] = (
        await this.espModel.findOne({ uuid: id }, { tags: 1, _id: 0 }).exec()
      ).tags;
  
      const newTags: string[] = [];
  
      data.tags.forEach((tag: string) => {
        if (!oldTags.includes(tag)) {
          newTags.push(tag);
        }
      });
  
      if (!newTags.length) {
        throw new NothingChangedException("Tag(s) already added to Light");
      }
  
      const newLight: EspDocument = await this.espModel
        .findOneAndUpdate(
          { uuid: id },
          { tags: [...newTags, ...oldTags] },
          { new: true, projection: lightProjection },
        )
        .exec();
  
      return {
        message: `Succesfully added the following tags: ${newTags}!`,
        object: newLight as Light,
      };
    }

    async removeTags(
      id: string,
      data: UpdateTagsDto,
    ): Promise<StandartResponse<Light>> {
      const oldLight: EspDocument = await this.espModel
        .findOne({ uuid: id }, { tags: 1, _id: 0 })
        .exec();
      const oldTags: string[] = [...oldLight.tags];
  
      const newTags: string[] = [];
      const remTags: string[] = [];
  
      oldTags.forEach((tag: string) => {
        if (!data.tags.includes(tag)) {
          newTags.push(tag);
        } else {
          remTags.push(tag);
        }
      });
  
      if (isEqual(oldLight.tags, newTags)) {
        throw new NothingChangedException("No Tag was removed!");
      }
  
      const newLight: EspDocument = await this.espModel
        .findOneAndUpdate(
          { uuid: id },
          { tags: newTags },
          { new: true, projection: lightProjection },
        )
        .exec();
      return {
        message: `Succesfully removed the following tags: ${remTags}!`,
        object: newLight as Light,
      };
    }

}
