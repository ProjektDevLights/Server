import { UseFilters, UsePipes, ValidationPipe } from "@nestjs/common";
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from "@nestjs/websockets";
import { ControlService } from "../../http/lights/control/control.service";
import { SettingsService } from "../../http/lights/settings/settings.service";
import { Light, StandartResponse } from "../../interfaces";
import { DatabaseEspService } from "../../services/database/esp/database-esp.service";
import { UtilsService } from "../../services/utils/utils.service";
import { ExceptionFilter } from "../exception.filter";
import { LightAllDto } from "./dto/light-all.dto";

@WebSocketGateway({
  cors: { origin: "*" },
})
export class LightInGateway {
  constructor(
    private settingsService: SettingsService,
    private controlService: ControlService,
    private utilsService: UtilsService,
    private dbService: DatabaseEspService,
  ) {}

  @UseFilters(ExceptionFilter)
  @UsePipes(new ValidationPipe())
  @SubscribeMessage("light_change")
  async handleMessage(
    @MessageBody() light: LightAllDto,
  ): Promise<StandartResponse<Light>> {
    if (!(await this.utilsService.isIdValid(light.id)))
      throw new WsException("There is no light with this ID!");
    if ("name" in light) {
      await this.settingsService.update(light.id, { name: light.name });
    }
    if ("isOn" in light) {
      if (light.isOn) {
        await this.controlService.on(light.id);
      } else {
        await this.controlService.off(light.id);
      }
    }

    return {
      message: "Succesfully made changes to light!",
      object: DatabaseEspService.espDocToLight(
        await this.dbService.getEspWithId(light.id),
      ),
    };
  }
}
