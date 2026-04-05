import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';
import { buildUploadsStoredPath } from './public-asset-url';
import { resolveUploadsRoot } from './uploads-path';

const uploadsRoot = resolveUploadsRoot();
const uploadLog = new Logger('UploadsController');

function tenantUploadDir(req: unknown) {
  const user = (req as { user: JwtUserPayload }).user;
  const dir = join(uploadsRoot, 'tenants', user.tid);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeTenantUploadDir(req: unknown) {
  try {
    return tenantUploadDir(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    uploadLog.error(
      `mkdir/tenant dir falló bajo ${uploadsRoot}: ${msg}`,
      err instanceof Error ? err.stack : undefined,
    );
    throw new BadRequestException(
      `No se pudo guardar el archivo en el servidor (${msg}). Revisá UPLOADS_DIR y permisos de escritura.`,
    );
  }
}

const imageFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (e: Error | null, ok: boolean) => void,
) => {
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
    cb(new BadRequestException('Solo imágenes JPG, PNG, WEBP o GIF'), false);
    return;
  }
  cb(null, true);
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination(req, _file, cb) {
          try {
            cb(null, safeTenantUploadDir(req));
          } catch (e) {
            cb(e as Error, '');
          }
        },
        filename(_req, file, cb) {
          const ext = extname(file.originalname).toLowerCase();
          const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
            ? ext
            : '.jpg';
          cb(null, `${randomUUID()}${safe}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  productImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    const rel = `tenants/${req.user.tid}/${file.filename}`;
    return { url: buildUploadsStoredPath(rel) };
  }

  @Post('tenant-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination(req, _file, cb) {
          try {
            cb(null, safeTenantUploadDir(req));
          } catch (e) {
            cb(e as Error, '');
          }
        },
        filename(_req, file, cb) {
          const ext = extname(file.originalname).toLowerCase();
          const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
            ? ext
            : '.jpg';
          cb(null, `logo-${randomUUID()}${safe}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  tenantLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    const rel = `tenants/${req.user.tid}/${file.filename}`;
    return { url: buildUploadsStoredPath(rel) };
  }

  @Post('tenant-banner')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination(req, _file, cb) {
          try {
            cb(null, safeTenantUploadDir(req));
          } catch (e) {
            cb(e as Error, '');
          }
        },
        filename(_req, file, cb) {
          const ext = extname(file.originalname).toLowerCase();
          const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
            ? ext
            : '.jpg';
          cb(null, `banner-${randomUUID()}${safe}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  tenantBanner(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    const rel = `tenants/${req.user.tid}/${file.filename}`;
    return { url: buildUploadsStoredPath(rel) };
  }
}
