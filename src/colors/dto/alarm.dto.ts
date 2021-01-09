import { IsDateString, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class AlarmDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @Min(0, {each: true})
  @Max(6, {each: true})
  @IsInt({each: true})
  days?: number[] = [];

  @IsOptional()
  @IsHexColor()
  color?: string;

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
  @IsString({each: true})
  @Matches(new RegExp(/([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])/), {each: true})
  ids: string[]
  
}
