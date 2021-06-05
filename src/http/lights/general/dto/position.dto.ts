import { IsInt, Min } from "class-validator";

export class PositionDto {
  @Min(0)
  @IsInt()
  position: number;
}
