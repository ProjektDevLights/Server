import { HttpException, HttpStatus } from "@nestjs/common";
import { Conflict } from "src/http/alarm/alarm.service";

export class AlarmConflictException extends HttpException {

  object: Conflict[];
  constructor(object: Conflict[]) {
    super("The alarm is conflicting with existing alarms! Consider turning them off or changing the lights, time or days in them.", 409);
    this.object = object;

  }
}
