import { HttpException, HttpStatus } from "@nestjs/common";

export class CustomException extends HttpException {
  constructor(message: string, status: HttpStatus = 400) {
    super(message, status);
  }
}
