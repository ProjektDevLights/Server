import { IsDateString, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { IsFutureDate } from "src/decorators/is-future-date.decorator";

export class AlarmDto {

  @IsFutureDate()
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsOptional()
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsInt({ each: true })
  days?: number[] = [];

  @IsHexColor()
  color: string;

  /*
  @IsOptional()
  @IsInt()
  delay?: number;

  @IsOptional()
  @IsInt()
  time?: number; */

  @IsOptional()
  @IsInt()
  @Min(-1)
  repeat?: number = 0;

  @IsNotEmpty()
  @IsString({ each: true })
  @Matches(new RegExp(/([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])/), { each: true })
  ids: string[]

}
