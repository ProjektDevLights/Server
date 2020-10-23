import { IsIP, IsString } from "class-validator";

export class UpdateDto {

  @IsString()
  @IsIP()
  ip: string

  @IsString()
  id: string
}