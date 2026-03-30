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
          'La base de datos no coincide con el esquema. En la raíz del repo ejecutá: npm run db:migrate (prisma migrate deploy; no requiere permiso CREATEDB). db:migrate:dev solo si tu usuario PostgreSQL puede crear bases (shadow); si falla con P3014, usá db:migrate.',
        code: 'P2022',
      });
    }

    return super.catch(exception, host);
  }
}
