import { IsIP, IsString } from "class-validator";

export class SetupDto {

    @IsString()
    @IsIP()
    ip: string
}