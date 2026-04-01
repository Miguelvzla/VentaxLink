import { config as loadEnv } from 'dotenv';
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
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';
import { MulterExceptionFilter } from './uploads/multer-exception.filter';
import { resolveUploadsRoot } from './uploads/uploads-path';

const uploadsRoot = resolveUploadsRoot();

const skipOptions = (req: express.Request) => req.method === 'OPTIONS';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  const corsExtra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function corsAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (corsExtra.includes(origin)) return true;
    return (
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
      /^https:\/\/.*\.railway\.app$/.test(origin) ||
      /^https:\/\/([a-z0-9-]+\.)*ventaxlink\.ar$/.test(origin)
    );
  }

  /** Antes de body parser y rate limits: preflight OPTIONS debe recibir CORS. */
  app.enableCors({
    origin: (origin, callback) => {
      if (corsAllowed(origin)) {
        callback(null, origin ?? true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['Content-Type'],
  });

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
    skip: skipOptions,
  });
  const authLoginLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });
  const authRegisterLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_REGISTER_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });
  const checkoutLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });
  const trackLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_TRACK_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_TRACK_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });
  const contactLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_CONTACT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_CONTACT_MAX || 8),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });
  const mailTestLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_MAIL_TEST_WINDOW_MS || 900_000),
    max: Number(process.env.RATE_LIMIT_MAIL_TEST_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipOptions,
  });

  app.use('/v1', globalLimiter);
  app.use('/v1/auth/login', authLoginLimiter);
  app.use('/v1/auth/register', authRegisterLimiter);
  app.use('/v1/store/:slug/checkout', checkoutLimiter);
  app.use('/v1/store/:slug/track', trackLimiter);
  app.use('/v1/store/:slug/mail-test', mailTestLimiter);
  app.use('/v1/public/contact', contactLimiter);

  const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 15_000);
  const contactTimeoutMs = Number(
    process.env.CONTACT_REQUEST_TIMEOUT_MS || 45_000,
  );
  app.use((req, res, next) => {
    const path = req.path || '';
    const ms =
      path.includes('/public/contact') || path.includes('/mail-test')
        ? contactTimeoutMs
        : requestTimeoutMs;
    req.setTimeout(ms);
    res.setTimeout(ms);
    next();
  });

  app.use('/v1/uploads', express.static(uploadsRoot));
  app.setGlobalPrefix('v1');
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new MulterExceptionFilter(),
    new PrismaClientExceptionFilter(httpAdapterHost.httpAdapter),
  );
  new Logger('Bootstrap').log(
    `Uploads: UPLOADS_DIR efectivo = ${uploadsRoot} (configurá UPLOADS_DIR en Railway si hace falta)`,
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT) || 3001;
  const server = await app.listen(port);
  const serverRequestTimeoutMs = Math.max(requestTimeoutMs, contactTimeoutMs);
  server.requestTimeout = serverRequestTimeoutMs;
  server.headersTimeout = serverRequestTimeoutMs + 5_000;
  server.keepAliveTimeout = Number(
    process.env.KEEP_ALIVE_TIMEOUT_MS || 5_000,
  );
}
bootstrap();
