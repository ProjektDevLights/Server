import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class FadingLedsDto {
  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @IsInt()
  @IsNotEmpty()
  time?: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  delay?: number;
}
