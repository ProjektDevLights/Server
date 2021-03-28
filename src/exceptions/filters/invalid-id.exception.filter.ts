import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { ServerResponse } from "http";
import { FastifyReply } from "fastify";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { InvalidIdException } from "../invalid-id.exception";

@Catch(InvalidIdException)
export class InvalidIdExceptionFilter implements ExceptionFilter {
  catch(exception: InvalidIdException, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: FastifyReply = ctx.getResponse<FastifyReply>();
    response.status(exception.getStatus()).send({
      statusCode: exception.getStatus(),
      message: exception.message,
      error: "Invalid id",
      object: exception.object,
    });
  }
}
