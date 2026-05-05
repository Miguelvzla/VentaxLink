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
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';
import { detectImageMime } from '../common/image-magic';
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

/**
 * El mimetype declarado por el cliente no es confiable: validamos los
 * magic bytes después de que Multer guardó el archivo y, si no coinciden
 * con una imagen permitida, lo borramos del disco y respondemos 400.
 */
async function assertRealImageOrCleanup(filePath: string): Promise<void> {
  const mime = await detectImageMime(filePath);
  if (!mime) {
    await unlink(filePath).catch(() => undefined);
    throw new BadRequestException(
      'El archivo no es una imagen válida (JPG, PNG, WEBP o GIF).',
    );
  }
}

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
  async productImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    await assertRealImageOrCleanup(file.path);
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
  async tenantLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    await assertRealImageOrCleanup(file.path);
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
  async tenantBanner(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { protocol: string; get: (h: string) => string | undefined; user: JwtUserPayload },
  ) {
    if (!file) throw new BadRequestException('Seleccioná un archivo');
    await assertRealImageOrCleanup(file.path);
    const rel = `tenants/${req.user.tid}/${file.filename}`;
    return { url: buildUploadsStoredPath(rel) };
  }
}
