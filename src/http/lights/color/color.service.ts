import { BadRequestException, Injectable } from '@nestjs/common';
import { isEqual } from 'lodash';
import { DatabaseEspService } from 'src/services/database/esp/database-esp.service';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { OffException } from '../../../exceptions/off.exception';
import { Light, StandartResponse } from '../../../interfaces';
import { EspDocument } from '../../../schemas/esp.schema';
import { TcpService } from '../../../services/tcp/tcp.service';
import { UtilsService } from '../../../services/utils/utils.service';
import { BlinkLedsDto } from './dto/blink-leds.dto';
import { BlinkingLedsDto } from './dto/blinking-leds.dto';
import { FadingLedsDto } from './dto/fading-leds.dto';
import { UpdateLedsDto } from './dto/update-leds.dto';

@Injectable()
export class ColorService {

  constructor(
    private databaseService: DatabaseEspService,
    private utilsService: UtilsService,
    private tcpService: TcpService
  ) { }


  async updateLeds(
    id: string,
    data: UpdateLedsDto,
  ): Promise<StandartResponse<Light>> {


    data.colors = this.utilsService.makeValidHexArray(data.colors);
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);

    if (isEqual(data.colors, oldDoc.leds.colors)) throw new NothingChangedException("Nothing changed");
    if (!this.utilsService.isValidPattern(data)) throw new BadRequestException("Wrong colors or pattern provided");
    if (!oldDoc.isOn) throw new OffException();

    this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
      data.colors,
    )}, "pattern": "${oldDoc.leds.pattern}"}}`, oldDoc.ip);

    const newDoc = await this.databaseService.updateEspWithId(id, {
      leds: {
        colors: data.colors,
        pattern: data.pattern,
      },
    });
    return {
      message: "Succesfully changed the color of the light!",
      object: this.databaseService.espDocToLight(newDoc),
    };
  }

  async fadeToColor(
    id: string,
    data: FadingLedsDto,
  ): Promise<StandartResponse<Light>> {


    data.color = this.utilsService.makeValidHex(data.color);
    data.delay = data.delay ?? 1000;
    data.time = data.time ?? 5000;

    const oldDoc = await this.databaseService.getEspWithId(id);

    if (oldDoc.leds.pattern != "plain") throw new BadRequestException("Pattern must be Plain!");
    if (oldDoc.leds.colors[0] === data.color) throw new NothingChangedException();

    let resDoc: EspDocument;
    if (data.delay < 1000 || data.time < 2000) {
      this.tcpService.sendData(`{"command": "fade", "data": {"color":"${this.utilsService.hexToRgb(
        data.color,
      )}"}"]}}`, oldDoc.ip);
      resDoc = await this.databaseService.updateEspWithId(id, { leds: { colors: [data.color], pattern: "plain" } })
    } else {


      resDoc = await this.databaseService.updateEspWithId(id, {
        leds: {
          colors: [data.color],
          pattern: "fading",
        },
      })

      let color: string = data.color;
      let time: number = data.time;
      let delay: number = data.delay
      this.utilsService.fading(id, { color, time, delay }, oldDoc);
    }
    return {
      message: "Fading the color!",
      object: this.databaseService.espDocToLight(resDoc),
    };
  }


  async blinkColor(
    id: string,
    data: BlinkLedsDto
  ): Promise<StandartResponse<Light>> {

    const doc: EspDocument = await this.databaseService.getEspWithId(id);


    if (!doc.isOn) throw new OffException();
    this.tcpService.sendData(`{"command": "blink", "data": {"color": "${this.utilsService.hexToRgb(data.color)}", "time": ${data.time}}}`, doc.ip);

    return {
      message: "Blinking color!",
      object: this.databaseService.espDocToLight(doc),
    };
  }

  async blinkColorLoop(
    id: string,
    data: BlinkingLedsDto,
  ): Promise<StandartResponse<Light>> {
    let length: number = data?.colors?.length ?? 0;

    //make helper method
    for (let i = 0; i < length; i++) {
      data.colors[i] = this.utilsService.makeValidHex(data.colors[i]);
    }

    const oldDoc: EspDocument = await this.databaseService.getEspWithId(id);


    if (oldDoc.leds.pattern != "plain") throw new BadRequestException("Pattern must be Plain!");


    const newDoc = await this.databaseService.updateEspWithId(id, {
      leds: {
        colors: data.colors ?? oldDoc.leds.colors,
        pattern: "blinking",
      }
    })

    if (data.delay < 100) data.delay = 100;
    const delay = data.delay;
    let runs: number = Math.ceil(data.time / delay);
    let cIndex: number = 0;
    let blinkColor: string = "#000000";

    const runInterval = setInterval(() => {
      if (runs <= 0) {

        this.tcpService.sendData(`{"command": "leds", "data": {"colors": ${this.utilsService.hexArrayToRgb(
          oldDoc.leds.colors,
        )}, "pattern": "plain"}}`, oldDoc.ip);



        this.databaseService.updateEspWithId(id, {
          leds: {
            colors: oldDoc.leds.colors,
            pattern: oldDoc.leds.pattern,
          },
        })
        clearInterval(runInterval);
        return;
      }

      let prevColor: string = data.colors
        ? data.colors[cIndex] ?? oldDoc.leds.colors[0]
        : oldDoc.leds.colors[0];
      blinkColor = blinkColor == "#000000" ? prevColor : "#000000";

      if (blinkColor == "#000000") {
        cIndex = cIndex >= data?.colors?.length - 1 ? 0 : cIndex + 1;
      }

      this.tcpService.sendData(`{"command": "leds", "data": {"colors": ["${this.utilsService.hexToRgb(
        blinkColor
      )}"], "pattern": "plain"}}`, oldDoc.ip);

      runs--;
    }, delay);

    return {
      message: "Blinking colors!",
      object: this.databaseService.espDocToLight(newDoc),
    };
  }

}
