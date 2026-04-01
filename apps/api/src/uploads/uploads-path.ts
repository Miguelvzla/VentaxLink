import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * En producción (PaaS) puede fallar escribir bajo cwd.
 * Usamos UPLOADS_DIR si existe y, si no, /tmp/ventaxlink-uploads.
 */
export function resolveUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR?.trim();
  const root = configured || resolve('/tmp', 'ventaxlink-uploads');
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
  }
  return root;
}
