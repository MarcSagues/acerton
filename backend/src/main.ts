import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
    // Cada peticion con Authorization va precedida de un preflight OPTIONS
    // (una ida y vuelta extra). Sin esto, WebKit/Chromium solo lo cachean 5 s,
    // asi que en la practica casi cada llamada pagaba dos viajes al servidor.
    // Los navegadores recortan el valor a su propio maximo (Chromium 2 h,
    // Safari/WebKit 10 min), asi que este numero solo marca "lo maximo posible".
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  const port = configService.get('port', { infer: true });
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}/api`);
}

bootstrap();
