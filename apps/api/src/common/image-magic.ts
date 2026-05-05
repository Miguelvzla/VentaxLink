import { open } from 'fs/promises';

export type AllowedImageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

/**
 * Detecta el MIME real de una imagen leyendo los magic bytes del archivo.
 * Solo reconoce JPEG, PNG, WEBP y GIF. Cualquier otra cosa devuelve null
 * (incluido SVG, HTML, ejecutables, etc.) y debe rechazarse.
 *
 *   JPEG: FF D8 FF
 *   PNG : 89 50 4E 47 0D 0A 1A 0A
 *   WEBP: 'RIFF' .... 'WEBP'
 *   GIF : 'GIF87a' o 'GIF89a'
 */
export async function detectImageMime(
  filePath: string,
): Promise<AllowedImageMime | null> {
  let fh;
  try {
    fh = await open(filePath, 'r');
    const { buffer, bytesRead } = await fh.read(Buffer.alloc(12), 0, 12, 0);
    if (bytesRead < 4) return null;

    if (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }
    if (
      bytesRead >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (
      bytesRead >= 6 &&
      (buffer.toString('ascii', 0, 6) === 'GIF87a' ||
        buffer.toString('ascii', 0, 6) === 'GIF89a')
    ) {
      return 'image/gif';
    }
    return null;
  } catch {
    return null;
  } finally {
    await fh?.close().catch(() => undefined);
  }
}
