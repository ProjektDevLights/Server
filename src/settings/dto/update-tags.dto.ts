import { IsString } from "class-validator";

export default class UpdateTagsDto {
  @IsString({ each: true })
  tags: string[];
}
