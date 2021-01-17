import { MiddlewareConsumer, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EspMiddleware } from 'src/middlewares/esp.middleware';
import { Esp, EspSchema } from '../../schemas/esp.schema';
import { EspController } from './esp.controller';
import { EspService } from './esp.service';

@Module({
  controllers: [EspController],
  providers: [EspService],
  imports: [MongooseModule.forFeature([{ name: Esp.name, schema: EspSchema }])]
})
export class EspModule {
  configure(consumer: MiddlewareConsumer) { 
    consumer.apply(EspMiddleware).forRoutes(EspController);  
  }
}