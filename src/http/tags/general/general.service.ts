import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { lightProjection } from '../../../globals';
import { Light, StandartResponse } from '../../../interfaces';
import { Esp, EspDocument } from '../../../schemas/esp.schema';

@Injectable()
export class GeneralService {

  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
  ) { }

  async getTags(): Promise<StandartResponse<string[]>> {
    const allTags: string[] = await this.espModel.distinct("tags").exec();
    return { message: "The following tags exist at the moment", object: allTags };
  }

  async getWithTag(tag: string): Promise<StandartResponse<Light[]>> {
    const lights: EspDocument[] = await this.espModel.find(
      { tags: { $all: [tag] } },
      lightProjection,
    );
    return { message: `Lights with tag ${tag}!`, object: lights as Light[] };
  }

}
