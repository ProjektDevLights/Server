import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { TcpService } from "./tcp.service";

@Module({
  providers: [TcpService],
  imports: [DatabaseModule],
  exports: [TcpService],
})
export class TcpModule {}
