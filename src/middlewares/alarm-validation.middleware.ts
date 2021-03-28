import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";
import { UtilsService } from "../services/utils/utils.service";

@Injectable()
export class AlarmValidationMiddleware implements NestMiddleware {
  constructor(private databaseService: DatabaseAlarmService) {}

  use(req: any, res: any, next: () => void) {
    this.databaseService
      .getAlarmWithId(req.originalUrl.split("/")[2])
      .then(next)
      .catch(() => {
        throw new NotFoundException("There is no alarm with this ID!");
      });
  }
}
