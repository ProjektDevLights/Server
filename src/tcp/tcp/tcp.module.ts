import { Module } from '@nestjs/common';
import { TcpService } from './tcp.service';

@Module({
    providers: [TcpService],
    exports: [TcpService]
})
export class TcpModule {}
