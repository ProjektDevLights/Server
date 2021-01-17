import {
    Controller,
    Get,
    Query,
    Res,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { Response } from "express";
import { SetupDto } from "./dto/setup.dto";
import { UpdateDto } from "./dto/update.dto";
import { EspService } from "./esp.service";

@Controller("esp")
@UsePipes(new ValidationPipe())
export class EspController {
    constructor(private readonly service: EspService) { }

    @Get("setup")
    async setup(@Query() data: SetupDto): Promise<string> {
        return this.service.setup(data);
    }

    @Get("update")
    async update(
        @Query() data: UpdateDto,
    ): Promise<void> {
        return this.service.update(data);
    }
}
