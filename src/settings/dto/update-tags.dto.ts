import { IsArray, IsOptional, IsString } from "class-validator";
import { each } from "lodash";

export default class UpdateTagsDto {

    @IsString({each: true})
    tags: string[];

}