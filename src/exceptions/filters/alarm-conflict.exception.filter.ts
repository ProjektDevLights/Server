import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { ServerResponse } from "http";
import { FastifyReply } from "fastify";
import { AlarmConflictException } from "../alarm-conflict.exception";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";

@Catch(AlarmConflictException)
export class AlarmConflictExpceptionFilter implements ExceptionFilter {
  catch(exception: AlarmConflictException, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: FastifyReply = ctx.getResponse<FastifyReply>();
    response.status(exception.getStatus()).send({
      statusCode: exception.getStatus(),
      message: exception.message,
      error: "Conflict",
      object: exception.object,
    });
  }
}
