import { IsDateString, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class AlarmDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsInt({each: true})
  days?: number[];

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
  repeat?: number;

  @IsNotEmpty()
  @IsString({each: true})
  @Matches(new RegExp(/([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])/), {each: true})
  ids: string[]
  
}
