import { IsNumber, IsPositive } from "class-validator";

export default class UpdateCountDto {

    @IsPositive()
    @IsNumber()
    count: number;
}
