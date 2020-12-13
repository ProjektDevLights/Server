import { IsArray, IsHexColor, IsInt, IsNotEmpty, IsString } from "class-validator";

export class BlinkingLedsDto {

  @IsArray()
  @IsString({each: true})
  @IsHexColor({each: true})
  colors?: string[];

  @IsInt()
  @IsNotEmpty()
  time: number;
}
