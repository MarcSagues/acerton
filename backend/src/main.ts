import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  // Detras del proxy de Render: sin esto, todas las peticiones llegarian con
  // la misma IP y el rate limiting (ThrottlerGuard) agruparia a todos los
  // usuarios en un unico contador.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
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
