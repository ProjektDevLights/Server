import { Injectable } from '@nestjs/common';
import { Esp, EspDocument } from '../../../schemas/esp.schema';
import { Light, StandartResponse } from '../../../interfaces';
import { lightProjection } from '../../../globals';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class GeneralService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    ) {}

    async getTags(): Promise<StandartResponse<string[]>>{
      const allTags: string[] = await this.espModel.distinct("tags").exec();
      return {message: "The following tags exist at the moment", object: allTags};
    }

    async getWithTag(tag: string): Promise<StandartResponse<Light[]>> {
        const lights: EspDocument[] = await this.espModel.find(
          { tags: { $all: [tag] } },
          lightProjection,
        );
        return { message: `Lights with tag ${tag}!`, object: lights as Light[] };
      }

}
