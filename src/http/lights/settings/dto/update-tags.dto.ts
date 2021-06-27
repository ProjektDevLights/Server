import { IsNotEmpty, IsString, MaxLength, NotContains } from "class-validator";
import { IsNotMultiLine } from "src/decorators/is-not-multiline.decorator";

export default class UpdateTagsDto {
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @IsNotMultiLine({ each: true })
  @MaxLength(25, { each: true })
  tags: string[];
}
