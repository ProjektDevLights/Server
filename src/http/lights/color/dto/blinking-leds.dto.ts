import {
  IsArray,

  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";


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
