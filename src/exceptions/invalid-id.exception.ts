import { HttpException, HttpStatus } from "@nestjs/common";

export class InvalidIdException extends HttpException {
  object: string[];
  constructor(ids: string[]) {
    super(
      "One or more given Ids are not valid, probably because they not exist.",
      404,
    );
    this.object = ids;
  }
}
