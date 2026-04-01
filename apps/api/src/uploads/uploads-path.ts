import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/**
 * En producción (PaaS) puede fallar escribir bajo cwd.
 * Usamos UPLOADS_DIR si existe y, si no, /tmp/ventaxlink-uploads.
 */
export function resolveUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR?.trim();
  const candidates = [
    configured,
    resolve(process.cwd(), 'uploads'),
    resolve('/tmp', 'ventaxlink-uploads'),
  ].filter((p): p is string => !!p);

  for (const root of candidates) {
    try {
      if (!existsSync(root)) {
        mkdirSync(root, { recursive: true });
      }
      return root;
    } catch {
      // intenta con el siguiente candidato
    }
  }
  throw new Error(
    'No se pudo preparar carpeta de uploads. Configurá UPLOADS_DIR con una ruta escribible.',
  );
}
