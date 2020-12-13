import { IsHexColor, IsInt, IsNotEmpty, IsString } from "class-validator";

export class FadingLedsDto {

  @IsString()
  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @IsInt()
  @IsNotEmpty()
  time: number;
}
