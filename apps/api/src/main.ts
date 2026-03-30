import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

for (const p of [
  resolve(process.cwd(), 'packages/database/.env'),
  resolve(process.cwd(), '../../packages/database/.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
]) {
  loadEnv({ path: p });
}
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';

const uploadsRoot = resolve(process.cwd(), 'uploads');
if (!existsSync(uploadsRoot)) {
  mkdirSync(uploadsRoot, { recursive: true });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use('/v1/uploads', express.static(uploadsRoot));
  app.setGlobalPrefix('v1');
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(httpAdapterHost.httpAdapter),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ],
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
}
bootstrap();
