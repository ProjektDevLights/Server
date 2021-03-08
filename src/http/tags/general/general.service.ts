import { Injectable } from '@nestjs/common';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { CountResponse, Light, StandartResponse } from '../../../interfaces';
import { EspDocument } from '../../../schemas/esp.schema';

@Injectable()
export class GeneralService {

  constructor(
    private databaseService: DatabaseEspService,
  ) { }

  async getTags(): Promise<CountResponse<string[]>> {
    const allTags: string[] = await this.databaseService.getEsps(true).distinct("tags").exec();
    return { message: "The following tags exist at the moment", count: allTags.length, object: allTags };
  }

  async getWithTag(tag: string): Promise<CountResponse<Light[]>> {
    const docs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);
    return { message: `Lights with tag ${tag}!`, count: docs.length ,object: DatabaseEspService.espDocsToLights(docs) };
  }

}
