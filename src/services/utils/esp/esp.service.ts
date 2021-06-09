import { Injectable, NotAcceptableException } from "@nestjs/common";
import { filter, map, max, sortBy } from "lodash";
import { EspDocument } from "../../../schemas/esp.schema";
import { DatabaseEspService } from "../../database/esp/database-esp.service";

@Injectable()
export class EspUtilsService {
  constructor(private databaseEspService: DatabaseEspService) {}
  async repositionESP(id: string, pos: number): Promise<EspDocument> {
    if (pos < 0)
      throw new NotAcceptableException(
        "Position must be greater than or equal 0",
      );

    const esps: EspDocument[] = filter(
      await this.databaseEspService.getEsps(),
      (e: EspDocument) => e.uuid != id,
    );
    pos =
      pos <= max(map(esps, "position")) + 1
        ? pos
        : max(map(esps, "position")) + 1;
    await this.databaseEspService.updateEspWithId(id, { position: pos });

    const greater = filter(esps, (e: EspDocument) => e.position >= pos);
    for (const e of greater) {
      await this.databaseEspService.updateEspWithId(e.uuid, {
        position: e.position + 1,
      });
    }
    await this.cleanPositions();
    return this.databaseEspService.getEspWithId(id);
  }

  async cleanPositions() {
    const esps: EspDocument[] = sortBy(
      await this.databaseEspService.getEsps(),
      "position",
    );
    for (let i = 0; i < esps.length; i++) {
      const e: EspDocument = esps[i];
      if (e.position != i) {
        await this.databaseEspService.updateEspWithId(e.uuid, {
          position: i,
        });
      }
    }
  }
}
