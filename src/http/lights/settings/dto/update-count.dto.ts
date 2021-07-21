import { IsNumber, IsPositive, Max } from "class-validator";

export default class UpdateCountDto {
  @IsPositive()
  @IsNumber()
  @Max(500)
  count: number;
}
