import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EspMiddleware } from 'src/middlewares/esp.middleware';
import { Esp, EspSchema } from 'src/schemas/esp.schema';
import { EspController } from './esp.controller';
import { EspService } from './esp.service';
@Module({
  providers: [EspService],
  controllers: [EspController],
  imports: [MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }])]
})
export class EspModule {

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EspMiddleware).forRoutes("esp/*");
  }

}
