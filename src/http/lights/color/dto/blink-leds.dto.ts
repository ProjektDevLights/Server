import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsString,
} from "class-validator";
export class BlinkLedsDto {
  @IsString()
  @IsHexColor()
  @IsNotEmpty()
  color: string;

  @IsInt()
  @IsNotEmpty()
  time: number;
}
