import { Get, Injectable } from "@nestjs/common";

@Injectable()
export class MainService {
  constructor() {}

  @Get()
  ping(): string {
    return "Pong";
  }
}
