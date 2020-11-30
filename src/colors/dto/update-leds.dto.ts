import { IsHexColor, IsNotEmpty, IsString } from "class-validator";
import { Pattern } from "../../types";

export class UpdateLedsDto {
  @IsString({ each: true })
  @IsNotEmpty()
  @IsHexColor({ each: true })
  colors: string[];

  @IsString()
  @IsNotEmpty()
  pattern: Pattern;
}
