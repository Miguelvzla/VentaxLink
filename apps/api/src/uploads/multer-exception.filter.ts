import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ method?: string; url?: string }>();
    this.logger.error(
      `${req.method ?? '?'} ${req.url ?? '?'} Multer ${exception.code}: ${exception.message}`,
      exception.stack,
    );
    const res = ctx.getResponse<Response>();
    const msg =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo (5MB).'
        : `Error al subir el archivo (${exception.code}).`;
    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: msg,
    });
  }
}
