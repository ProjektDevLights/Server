import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from "class-validator";
export class BlinkLedsDto {
  @IsString()
  @IsHexColor()
  @IsNotEmpty()
  color: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5000)
  time: number;
}
