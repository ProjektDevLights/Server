import { MiddlewareConsumer, Module } from "@nestjs/common";
import { EspMiddleware } from "src/middlewares/esp.middleware";
import { DatabaseModule } from "src/services/database/database.module";
import { EspController } from "./esp.controller";
import { EspService } from "./esp.service";

@Module({
  controllers: [EspController],
  providers: [EspService],
  imports: [DatabaseModule],
})
export class EspModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EspMiddleware).forRoutes(EspController);
  }
}
