import { HttpException, HttpStatus } from "@nestjs/common";

export class OffException extends HttpException {
    constructor(message?: string) {
      super(message ?? "The Light is Off!", HttpStatus.NOT_ACCEPTABLE);
    }
  }