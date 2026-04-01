import {
  type ArgumentsHost,
  Catch,
  HttpStatus,
  Logger,
  type HttpServer,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

/**
 * No usamos @Catch(Prisma.PrismaClientKnownRequestError): en monorepos puede haber
 * dos copias de @prisma/client y `instanceof` falla; el error cae en ExceptionsHandler.
 *
 * P2022 con meta.column "existe" suele ser PostgreSQL en español ("no existe la columna «…»").
 * La causa real casi siempre es BD sin migraciones aplicadas.
 */
@Catch()
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  constructor(httpAdapter: HttpServer) {
    super(httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<{ url?: string; method?: string }>();
    const url = typeof req?.url === 'string' ? req.url : '';
    if (url.includes('/uploads/')) {
      const msg =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`[uploads] ${req.method ?? '?'} ${url}: ${msg}`, stack);
    }

    const code =
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
        ? (exception as { code: string }).code
        : null;

    if (code === 'P2022') {
      const meta =
        exception &&
        typeof exception === 'object' &&
        'meta' in exception &&
        (exception as { meta?: unknown }).meta &&
        typeof (exception as { meta: unknown }).meta === 'object'
          ? ((exception as { meta: Record<string, unknown> }).meta as Record<
              string,
              unknown
            >)
          : undefined;
      this.logger.error(
        `P2022 (${String(meta?.modelName ?? '?')}) — esquema vs BD. Aplicá migraciones. ${String((exception as Error)?.message ?? '').replace(/\s+/g, ' ')}`,
      );
      const res = host.switchToHttp().getResponse<Response>();
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'No pudimos guardar los datos: falta aplicar migraciones en la base de producción. Quien administra el servidor: en la raíz del repo, `npm run db:migrate` con DATABASE_URL de Railway; en el próximo deploy usá `npm run start:api:prod` como comando de inicio.',
        code: 'P2022',
      });
    }

    return super.catch(exception, host);
  }
}
