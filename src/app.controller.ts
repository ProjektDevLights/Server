import { Controller, Get } from '@nestjs/common';
import { TcpService } from './tcp/tcp/tcp.service';

@Controller('')
export class AppController {

    constructor(private tcpService: TcpService){}
    @Get("ping")
    ping() {
        return "pong";
    }
}
