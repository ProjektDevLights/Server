import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Alarm, AlarmDocument } from '../../../schemas/alarm.schema';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, PartialLight, StandartResponse } from '../../../interfaces';
import { Model } from 'mongoose';
import { UtilsService } from '../../../services/utils/utils.service';
import { TcpService } from '../../../services/tcp/tcp.service';
import { NothingChangedException } from 'src/exceptions/nothing-changed.exception';
import { lightProjection } from '../../../globals';

@Injectable()
export class ControlService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private utilsService: UtilsService,
        private tcpService: TcpService
    ) {}

    async onTags(tag: string): Promise<StandartResponse<Light[]>> {
        const oldLights: EspDocument[] = await this.espModel
          .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
          .exec();
        const newLights: Light[] = [];
        oldLights.forEach((light: EspDocument) => {
          if (!light.isOn) {
            newLights.push(light as Light);
          }
        });
        if (newLights.length <= 0) {
          throw new NothingChangedException("All lights are already on");
        }
    
        const lights: EspDocument[] = await this.espModel
          .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
          .exec();
        const ips: string[] = [];
        const rest: Light[] = [];
        lights.forEach(async element => {
          ips.push(element.ip);
          rest.push(await this.utilsService.espDocToLight(element));
        });
        ips.forEach((ip: string) => {
          this.tcpService.sendData(`{"command": "on"}`, ip)
        });
    
        await this.espModel
          .updateMany(
            { tags: { $all: [tag] } },
            { $set: { isOn: true } },
            {
              new: true,
              projection: { __v: 0, _id: 0 },
            },
          )
          .exec();
    
        return {
          message: `All Lights with the Tag ${tag} are on now!  The following lights have been changed.`,
          object: rest as Light[],
        };
    }

    async offTags(tag: string): Promise<StandartResponse<Light[]>> {
        const oldLights: EspDocument[] = await this.espModel
          .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
          .exec();
        const newLights: Light[] = [];
        oldLights.forEach((light: EspDocument) => {
          if (light.isOn) {
            newLights.push(light as Light);
          }
        });
        if (newLights.length <= 0) {
          throw new NothingChangedException("All lights are already off!");
        }
    
        const lights: EspDocument[] = await this.espModel
          .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
          .exec();
        const ips: string[] = [];
        const rest: Light[] = [];
        lights.forEach(async element => {
          ips.push(element.ip);
          rest.push(await this.utilsService.espDocToLight(element));
        });
        ips.forEach((ip: string) => {
          this.tcpService.sendData(`{"command": "off"}`, ip)
        });
    
        await this.espModel
          .updateMany(
            { tags: { $all: [tag] } },
            { $set: { isOn: false } },
            {
              new: true,
              projection: { __v: 0, _id: 0 },
            },
          )
          .exec();
    
        return {
          message: `All Lights with the Tag ${tag} are off now! The following lights have been changed.`,
          object: rest as Light[],
        };
      }

      async restartWithTag(tag: string): Promise<StandartResponse<PartialLight[]>> {
        const queryResult: EspDocument[] = await this.utilsService.getEspsWithTag(
          tag,
        );
          console.log(queryResult)
        const returns: PartialLight[] = [];
    
        queryResult.forEach(element => {
          returns.push({
            name: element.name,
            id: element.uuid,
          });
          this.tcpService.sendData(`{"command": "restart"}`, element.ip);
          this.tcpService.removeConnection(element.ip);
        });
    
        return {
          message: "Restarting...",
          object: returns,
        };
      }

      async resetWithTag(tag: string): Promise<StandartResponse<PartialLight[]>> {
        const queryResult: EspDocument[] = await this.utilsService.getEspsWithTag(
          tag,
        );
    
        const results: PartialLight[] = [];
    
        queryResult.forEach(element => {
          results.push({
            name: element.name,
            id: element.uuid,
          });
          this.espModel.findOneAndDelete({ uuid: element.uuid }).exec();
          this.tcpService.sendData(`{"command": "reset"}`, element.ip);
          this.tcpService.removeConnection(element.ip);    
        });
    
        return {
          message: "Resetting...",
          object: results,
        };
      }

}
