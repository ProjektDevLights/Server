import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from "class-validator";

export class CustomPatternDto {
  @ValidateNested()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => CustomData)
  data: CustomData[];
}

export class CustomData {
  @IsNotEmpty()
  @IsNumber()
  repeat: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsHexColor({ each: true })
  leds: string[];
}
