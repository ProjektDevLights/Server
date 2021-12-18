import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { config } from './config';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(MainModule, new FastifyAdapter());
  app.enableCors();
  app.enableShutdownHooks();
  app.register(require('middie'))
  //app.use(LoggerMiddleware);
  await app.listen(config.port,'0.0.0.0');
}
bootstrap();
