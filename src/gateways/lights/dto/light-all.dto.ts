import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidationArguments,
} from "class-validator";
import { IsNotMultiLine } from "../../../decorators/is-not-multiline.decorator";

export class LightAllDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsBoolean()
  isOn?: boolean;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @IsNotMultiLine()
  @MaxLength(25)
  @Matches(/.*[a-zA-Z0-9\.\,\'\+\\\/\_\#\-\~]+.*/, {
    message: (args: ValidationArguments): string => {
      return args.property + " must at least contain one character";
    },
  })
  name?: string;
}
