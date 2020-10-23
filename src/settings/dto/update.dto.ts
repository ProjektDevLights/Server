import { IsOptional, IsString } from "class-validator";

export default class UpdateInfoDto {

    @IsString()
    @IsOptional()
    name?: string;

}