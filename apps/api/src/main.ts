import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import rateLimit from 'express-rate-limit';

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
  app.set('trust proxy', 1);
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '256kb' }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: process.env.URLENCODED_BODY_LIMIT || '256kb',
    }),
  );

  const globalLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLoginLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authRegisterLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_REGISTER_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
  });
  const checkoutLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
  });
  const trackLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_TRACK_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_TRACK_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/v1', globalLimiter);
  app.use('/v1/auth/login', authLoginLimiter);
  app.use('/v1/auth/register', authRegisterLimiter);
  app.use('/v1/store/:slug/checkout', checkoutLimiter);
  app.use('/v1/store/:slug/track', trackLimiter);

  const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 15_000);
  app.use((req, res, next) => {
    req.setTimeout(requestTimeoutMs);
    res.setTimeout(requestTimeoutMs);
    next();
  });

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
  const corsExtra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^https:\/\/.*\.railway\.app$/,
      ...corsExtra,
    ],
    credentials: true,
  });
  const port = Number(process.env.PORT) || 3001;
  const server = await app.listen(port);
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = requestTimeoutMs + 5_000;
  server.keepAliveTimeout = Number(
    process.env.KEEP_ALIVE_TIMEOUT_MS || 5_000,
  );
}
bootstrap();
