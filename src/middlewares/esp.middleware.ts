import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class EspMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void): void {
    if (!req.headers["user-agent"].toLowerCase().includes("arduino")) {
      throw new ForbiddenException("You aren't allowed to use this route!");
    }
    next();
  }
}
