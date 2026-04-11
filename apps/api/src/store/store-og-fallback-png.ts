import { PNG } from 'pngjs';

const OG_W = 1200;
const OG_H = 630;

/**
 * PNG 1200×630 en JS puro (sin Sharp). Sirve si Sharp falla en el host o hay otro error.
 */
export function encodeOgFallbackPng(): Buffer {
  const png = new PNG({ width: OG_W, height: OG_H });
  const { data } = png;
  if (!data) return Buffer.alloc(0);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 232;
    data[i + 1] = 232;
    data[i + 2] = 234;
    data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}
