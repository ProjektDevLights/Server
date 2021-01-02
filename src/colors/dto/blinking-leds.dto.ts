import {
  IsArray,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { Pattern } from "../../types";

export class BlinkingLedsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsHexColor({ each: true })
  colors?: string[];

  @IsInt()
  @IsNotEmpty()
  time: number;

  @IsInt()
  @IsNotEmpty()
  delay: number;
}
