import { PNG } from 'pngjs';

const OG_W = 1200;
const OG_H = 630;

/** 1×1 PNG válido (último recurso si pngjs falla por memoria, etc.). */
export const OG_EMERGENCY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7n6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * PNG 1200×630 en JS puro. Si falla, devuelve un PNG mínimo para no romper el endpoint.
 */
export function encodeOgFallbackPng(): Buffer {
  try {
    const png = new PNG({ width: OG_W, height: OG_H });
    const { data } = png;
    if (!data) return OG_EMERGENCY_PNG;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 232;
      data[i + 1] = 232;
      data[i + 2] = 234;
      data[i + 3] = 255;
    }
    return PNG.sync.write(png);
  } catch {
    return OG_EMERGENCY_PNG;
  }
}
