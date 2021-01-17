import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, StandartResponse } from '../../../interfaces';
import { Model } from 'mongoose';
import { lightProjection } from '../../../globals';

@Injectable()
export class GeneralService {
    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
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


}
