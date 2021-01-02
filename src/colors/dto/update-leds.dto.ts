import { IsHexColor, IsNotEmpty, IsString, IsEnum } from "class-validator";
import { Pattern } from "../../types";

export class UpdateLedsDto {
  @IsString({ each: true })
  @IsNotEmpty()
  @IsHexColor({ each: true })
  colors: string[];

  @IsString()
  @IsEnum(Pattern)
  @IsNotEmpty()
  pattern: Pattern;
}
