import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";

@Catch(WsException, HttpException)
export class ExceptionFilter extends BaseWsExceptionFilter {
  public catch(exception: HttpException | WsException, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      exception = new WsException(exception.message);
    }
    host.getArgByIndex(2)(exception);
  }
}
