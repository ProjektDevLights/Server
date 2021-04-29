import {
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { IsPattern } from "src/decorators/is-pattern.decorator";
import { Pattern } from "../../../../interfaces/patterns/pattern.type";

export class UpdateLedsDto {
  @IsOptional()
  @IsString({ each: true })
  @IsHexColor({ each: true })
  colors: string[];

  @IsPattern()
  @IsString()
  @IsNotEmpty()
  pattern: Pattern;

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(1)
  @Max(30000)
  timeout: number;
}
