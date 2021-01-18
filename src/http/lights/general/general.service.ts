import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, StandartResponse } from '../../../interfaces';
import { Model } from 'mongoose';
import { lightProjection } from '../../../globals';
import { TcpService } from 'src/services/tcp/tcp.service';
import { UtilsService } from 'src/services/utils/utils.service';

@Injectable()
export class GeneralService {
    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
        private tcpService: TcpService,
        private utilsService: UtilsService,
    ) {}

    async getAll(): Promise<StandartResponse<Light[]>> {
        const lights: Light[] = (await this.espModel.find(
          {},
          lightProjection,
        )) as Light[];
        return { message: "List of all lights", object: lights };
      }
    
    async get(id: string): Promise<StandartResponse<Light>> {
      const light: Light = (await this.espModel.findOne(
        { uuid: id },
        lightProjection,
      )) as Light;
      return { message: "Found light", object: light };
    }

    async pass(id: string, data: string): Promise<StandartResponse<Light>>{
      const light: EspDocument = (await this.espModel.findOne(
        { uuid: id },
      ))
      this.tcpService.sendData(data,light.ip);
      return {message: "Passed data", object: this.utilsService.espDocToLight(light)}
    }


}
