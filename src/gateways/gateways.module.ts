import { Module } from "@nestjs/common";
import { ControlService } from "../http/lights/control/control.service";
import { GeneralService } from "../http/lights/general/general.service";
import { SettingsService } from "../http/lights/settings/settings.service";
import { CronModule } from "../services/cron/cron.module";
import { DatabaseModule } from "../services/database/database.module";
import { TcpModule } from "../services/tcp/tcp.module";
import { EspUtilsService } from "../services/utils/esp/esp.service";
import { UtilsService } from "../services/utils/utils.service";
import { LightInGateway } from "./lights/light-in.gateway";

@Module({
  providers: [
    UtilsService,
    LightInGateway,
    ControlService,
    GeneralService,
    EspUtilsService,
    SettingsService,
  ],
  imports: [TcpModule, DatabaseModule, CronModule],
})
export class GatewaysModule {}
