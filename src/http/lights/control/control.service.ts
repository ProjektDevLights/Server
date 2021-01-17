import { Injectable } from '@nestjs/common';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, PartialLight, StandartResponse } from '../../../interfaces';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UtilsService } from '../../../services/utils/utils.service';
import { TcpService } from '../../../services/tcp/tcp.service';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { lightProjection } from '../../../globals';
import { isEqual } from 'lodash';

@Injectable()
export class ControlService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private utilsService: UtilsService,
        private tcpService: TcpService
    ) { }

    async on(id: string): Promise<StandartResponse<Light>> {
        const oldLight: EspDocument = await this.espModel
            .findOne({ uuid: id }, { __v: 0, _id: 0 })
            .exec();
        if (oldLight.isOn) {
            throw new NothingChangedException("The light is already on");
        }

        this.tcpService.sendData(`{"command": "on"}`, oldLight.ip)

        const newLight: EspDocument = await this.espModel
            .findOneAndUpdate(
                { uuid: id },
                { isOn: true },
                { new: true, projection: { __v: 0, _id: 0 } },
            )
            .exec();
        return {
            message: "Succesfully turned the light on!",
            object: { name: newLight.name, id: newLight.uuid } as Light,
        };
    }

    async off(id: string): Promise<StandartResponse<Light>> {
        const oldLight: EspDocument = await this.espModel
          .findOne({ uuid: id }, { __v: 0, _id: 0 })
          .exec();
        if (!oldLight.isOn) {
          throw new NothingChangedException("The light is already off");
        }
    
        this.tcpService.sendData(`{"command": "off"}`, oldLight.ip)
    
        const newLight: EspDocument = await this.espModel
          .findOneAndUpdate(
            { uuid: id },
            { isOn: false },
            { new: true, projection: { __v: 0, _id: 0 } },
          )
          .exec();
        return {
          message: "Successfully turned the light off!",
          object: { name: newLight.name, id: newLight.uuid } as Light,
        };
    }

    async restart(id: string): Promise<StandartResponse<PartialLight>> {
        const queryResult: EspDocument = await this.espModel
          .findOneAndUpdate(
            { uuid: id },
            { leds: { colors: ["#000000"], pattern: "plain" } },
            { new: true, projection: { __v: 0, _id: 0 } },
          )
          .exec();

          this.tcpService.sendData(`{"command": "restart"}`, queryResult.ip);
          this.tcpService.removeConnection(queryResult.ip);
        return {
          message: "Restarting...",
          object: { name: queryResult.name, id: queryResult.uuid },
        };
    } 

    async reset(id: string): Promise<StandartResponse<PartialLight>> {
      const queryResult: EspDocument = await this.espModel
        .findOne(
          { uuid: id },
          {
            __v: 0,
            _id: 0,
          },
        )
        .exec();
        this.tcpService.sendData(`{"command": "reset"}`, queryResult.ip);
  
      await this.espModel.findOneAndDelete({ uuid: id }).exec();
      return {
        message: "Resetting...",
        object: { name: queryResult.name, id: queryResult.uuid },
      };
    }

}
