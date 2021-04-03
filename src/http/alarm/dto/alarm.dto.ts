import {
  ArrayNotEmpty,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { IsNotMultiLine } from "../../../decorators/is-not-multiline.decorator";
import { IsRightTimeFormat } from "../../../decorators/is-time-format.decorator";

export class AlarmDto {
  @IsRightTimeFormat()
  time: string;

  @IsOptional()
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsInt({ each: true })
  days?: number[] = [];

  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @ArrayNotEmpty()
  @IsNotEmpty()
  @IsString({ each: true })
  @Matches(
    new RegExp(
      /([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])/,
    ),
    { each: true },
  )
  ids: string[];

  @IsOptional()
  @IsString()
  @IsNotMultiLine()
  name: string;
}
