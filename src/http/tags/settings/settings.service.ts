import { Injectable } from '@nestjs/common';
import { filter, pickBy } from 'lodash';
import { NothingChangedException } from 'src/exceptions/nothing-changed.exception';
import { OffException } from 'src/exceptions/off.exception';
import { Light, StandartResponse } from 'src/interfaces';
import { EspDocument } from 'src/schemas/esp.schema';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { TcpService } from 'src/services/tcp/tcp.service';

@Injectable()
export class SettingsService {

    constructor(
        private tcpService: TcpService,
        private databaseService: DatabaseEspService,
      ) {}

    async setBrightness(
        tag: string,
        brightness: number,
      ): Promise<StandartResponse<Light[]>> {

        const oldDocs: EspDocument[] = await this.databaseService.getEspsWithTag(tag);
    
        if (!filter(oldDocs, (doc: EspDocument) => doc.brightness != brightness).length) {
            
          throw new NothingChangedException();
        }
    
        if (!filter(oldDocs, (doc: EspDocument) => doc.isOn).length) throw new OffException();
        this.tcpService.batchSendData(
          `{"command": "brightness", "data": "${brightness}"}`,
          oldDocs,
        );
        const newDocs: EspDocument[] = await this.databaseService.updateEspsWithTag(tag, {
          brightness: brightness,
        });
    
        return {
          message: "Succesfully updated Lights brightness",
          object: DatabaseEspService.espDocsToLights(newDocs),
        };
      }

}
