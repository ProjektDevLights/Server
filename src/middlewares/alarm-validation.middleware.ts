import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { DatabaseAlarmService } from "src/services/database/alarm/database-alarm.service";

@Injectable()
export class AlarmValidationMiddleware implements NestMiddleware {
  constructor(private databaseService: DatabaseAlarmService) {}

  async use(req: any, res: any, next: () => void) {
    try {
      await this.databaseService.getAlarmWithId(req.originalUrl.split("/")[2]);
      next();
    } catch (e) {
      throw new NotFoundException("There is no alarm with this Id!");
    }
  }
}
