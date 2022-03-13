import {
  ArrayNotEmpty, IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min
} from "class-validator";
import { Leds } from "src/interfaces";
import { IsNotMultiLine } from "../../../decorators/is-not-multiline.decorator";
import { IsRightTimeFormat } from "../../../decorators/is-time-format.decorator";
import { CustomData } from "../../lights/color/dto/custom-pattern.dto";

export class AlarmDto {
  @IsRightTimeFormat()
  time: string;

  @IsOptional()
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsInt({ each: true })
  days?: number[] = [];

  @IsOptional()
  @IsNotEmpty({ each: true })
  leds?: Leds

  @IsOptional()
  custom_sequence?: CustomData[]

  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(
    new RegExp(
      /([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])/,
    ),
    {
      each: true,
    },
  )
  ids: string[];

  @IsOptional()
  @IsString()
  @IsNotMultiLine()
  name: string;
}
