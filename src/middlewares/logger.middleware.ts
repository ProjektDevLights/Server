import { NestMiddleware, Injectable } from "@nestjs/common";
import * as fs from "fs";

export async function LoggerMiddleware(
  req: Request,
  res: Response,
  next: () => void,
) {
   console.log(req);
  next();
}
