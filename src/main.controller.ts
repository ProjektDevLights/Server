import { Controller, Get } from "@nestjs/common";
import { MainService } from "./main.service";

@Controller("")
export class MainController {
  constructor(private mainService: MainService) {}

  //main service
  @Get("/ping")
  ping(): string {
    return this.mainService.ping();
  }
}
