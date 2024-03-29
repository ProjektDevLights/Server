import { Injectable } from "@nestjs/common";
import { EspDocument } from "src/schemas/esp.schema";
import { DatabaseEspService } from "src/services/database/esp/database-esp.service";
import { NothingChangedException } from "../../exceptions/nothing-changed.exception";
import { EspUtilsService } from "../../services/utils/esp/esp.service";
import { SetupDto } from "./dto/setup.dto";
import { UpdateDto } from "./dto/update.dto";

@Injectable()
export class EspService {
  constructor(
    private databaseService: DatabaseEspService,
    private espUtilsService: EspUtilsService,
  ) { }

  async setup(data: SetupDto): Promise<string> {
    const ips: string[] = await this.databaseService
      .getEsps(true)
      .distinct("ip")
      .exec();

    if (ips.includes(data.ip)) {
      return "This IP is already in use!";
    }

    if (ips.length >= 256 * 256) {
      //throw new ConflictException("This IP is already in use!");
      return "This IP is already in use!";
    }

    let id: string = "";

    const ids: string[] = await this.databaseService
      .getEsps(true)
      .distinct("ip")
      .exec();

    do {
      id =
        Math.round(Math.random() * 255) + "." + Math.round(Math.random() * 255);
    } while (ids.includes(id));

    const name = "(new) Devlight";
    try {
      await this.databaseService.addEsp({
        uuid: id,
        count: 150,
        name: name,
        ip: data.ip,
        leds: { pattern: "plain", colors: ["#1DE9B6"] },
        tags: [],
        isOn: true,
        brightness: 255,
        position: 0,
      });

      await this.espUtilsService.repositionESP(id, 0);
    } catch (e) {
      return "Something went wrong!";
    }
    return id;
  }

  async update(data: UpdateDto): Promise<void> {
    const oldDoc: EspDocument = await this.databaseService.getEspWithId(
      data.id,
    );
    if (oldDoc.ip === data.ip) {
      throw new NothingChangedException();
    }
    try {
      await this.databaseService.updateEspWithId(data.id, { ip: data.ip });
    } catch {
      console.error("This IP is already in use!");
    }
    return;
  }
}
