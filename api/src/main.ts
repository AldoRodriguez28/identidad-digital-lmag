import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

function assertIneEncryptionKey() {
  const raw = process.env.INE_ENCRYPTION_KEY;
  if (!raw || Buffer.from(raw, 'base64').length !== 32) {
    throw new Error(
      'INE_ENCRYPTION_KEY falta o es inválida (debe ser base64 de 32 bytes). ' +
        'Requerida para cifrar INE en reposo — ver .env.example.',
    );
  }
}

async function bootstrap() {
  assertIneEncryptionKey();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
