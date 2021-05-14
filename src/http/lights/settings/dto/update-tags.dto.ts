import { IsNotEmpty, IsString, NotContains } from "class-validator";

export default class UpdateTagsDto {
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @NotContains(" ", { each: true })
  tags: string[];
}
