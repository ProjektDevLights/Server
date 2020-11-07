import { HttpException, HttpStatus } from "@nestjs/common";

export class NothingChangedException extends HttpException {
    constructor(message?: string) {
      super(message ?? "Nothing changed!", HttpStatus.NOT_MODIFIED);
    }
  }