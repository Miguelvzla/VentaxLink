import type { Request, Response, NextFunction } from 'express';
import { relative, resolve } from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Sirve GET/HEAD bajo /v1/uploads/* desde `uploadsRoot` sin delegar en Nest cuando falta el archivo.
 * Así un 404 por archivo borrado o volumen vacío no dispara NotFoundException ni stack en logs.
 */
export function createUploadsStaticMiddleware(uploadsRoot: string) {
  const rootResolved = resolve(uploadsRoot);

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    // Tras mount en `/v1/uploads`, suele venir el path relativo en `req.url`; si no, se recorta de `originalUrl`.
    const fromMount = (req.url || '').split('?')[0].replace(/^\/+/, '');
    const fromOrig = (req.originalUrl || '')
      .split('?')[0]
      .replace(/^\/v1\/uploads\/?/i, '')
      .replace(/^\/+/, '');
    let rel = fromMount || fromOrig;
    try {
      rel = decodeURIComponent(rel);
    } catch {
      res.status(400).end();
      return;
    }
    if (!rel || rel.includes('..')) {
      res.status(404).end();
      return;
    }

    const filePath = resolve(rootResolved, rel);
    const relToRoot = relative(rootResolved, filePath);
    if (relToRoot.startsWith('..') || relToRoot === '') {
      res.status(404).end();
      return;
    }

    try {
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.status(404).end();
        return;
      }
    } catch {
      res.status(404).end();
      return;
    }

    res.sendFile(
      filePath,
      {
        maxAge: 31_536_000_000,
        immutable: true,
      },
      (err) => {
        if (err && !res.headersSent) {
          res.status(404).end();
        }
      },
    );
  };
}
