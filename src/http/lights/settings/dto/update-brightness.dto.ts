import { IsNumber, IsPositive, Max } from "class-validator";

export default class UpdateBrightnessDto {

    @IsPositive()
    @IsNumber()
    @Max(255)
    brightness: number;
}
