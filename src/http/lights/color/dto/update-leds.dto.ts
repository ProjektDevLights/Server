import { IsHexColor, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { IsPattern } from "src/decorators/is-pattern.decorator";
import { Pattern } from "../../../../interfaces/patterns/pattern.type";

export class UpdateLedsDto {
  @IsString({ each: true })
  @IsNotEmpty()
  @IsHexColor({ each: true })
  colors: string[];

  @IsPattern()
  @IsString()
  @IsNotEmpty()
  pattern: Pattern;

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  timeout: number;
}
