import { IsInt, IsPositive } from "class-validator";

export default class ScheduleOffDto {
  @IsPositive()
  @IsInt()
  minute: number;
}
