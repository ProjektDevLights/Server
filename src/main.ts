import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors();
  app.enableShutdownHooks();
  app.register(require('middie'))
  //app.use(LoggerMiddleware);
  await app.listen(80,'0.0.0.0');
}
bootstrap();
