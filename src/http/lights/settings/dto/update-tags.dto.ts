import { IsNotEmpty, IsString } from "class-validator";

export default class UpdateTagsDto {
  @IsNotEmpty({each: true})
  @IsString({ each: true })
  tags: string[];
}
