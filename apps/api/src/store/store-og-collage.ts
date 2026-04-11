import * as crypto from 'crypto';
import { readFile } from 'fs/promises';
import { join, normalize, resolve as pathResolve, sep } from 'path';
import jpegMod from '@jimp/js-jpeg';
import pngMod from '@jimp/js-png';
import { Jimp, JimpMime } from 'jimp';
import { getPublicApiOrigin } from '../uploads/public-asset-url';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';
import { resolveUploadsRoot } from '../uploads/uploads-path';

const OG_W = 1200;
const OG_H = 630;
const GUTTER = 12;
/** RGBA para celdas vacías / error */
const PLACEHOLDER_COLOR = 0xd4d4d8ff;
const BG_COLOR = 0xe8e8eaff;
/** Evita picos de memoria en PaaS antes del cover */
const MAX_DECODE_EDGE = 900;

export function hashOgPreviewVersion(versionInput: string): string {
  return crypto.createHash('sha256').update(versionInput).digest('hex').slice(0, 16);
}

/** URL absoluta para fetch desde la API (uploads relativos → PUBLIC_API_URL). */
export function resolveAbsoluteUrlForFetch(storedOrAbsolute: string): string | null {
  const t = storedOrAbsolute.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const origin = getPublicApiOrigin();
  if (!origin) return t.startsWith('/') ? t : null;
  if (t.startsWith('/v1/uploads/')) return `${origin}${t}`;
  if (t.startsWith('/')) return `${origin}${t}`;
  return null;
}

export function firstUsableProductImageUrl(
  images: { url: string }[],
): string | null {
  for (const im of images) {
    const u = rewriteStoredUploadsUrl(im.url) ?? im.url;
    const s = u?.trim() ?? '';
    if (!s) continue;
    if (
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('/v1/uploads/')
    ) {
      return s;
    }
  }
  return null;
}

function isPathInsideUploadsRoot(root: string, candidate: string): boolean {
  const r = pathResolve(root);
  const c = pathResolve(candidate);
  return c === r || c.startsWith(r + sep);
}

async function tryReadLocalUploadFile(url: string): Promise<Buffer | null> {
  const origin = getPublicApiOrigin()?.replace(/\/+$/, '');
  if (!origin) return null;
  const prefix = `${origin}/v1/uploads/`;
  if (!url.startsWith(prefix)) return null;
  const rel = normalize(url.slice(prefix.length)).replace(/^[\\/]+/, '');
  if (!rel || rel.includes('..')) return null;
  try {
    const root = pathResolve(resolveUploadsRoot());
    const full = pathResolve(join(root, rel));
    if (!isPathInsideUploadsRoot(root, full)) return null;
    const buf = await readFile(full);
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

export async function fetchImageBuffer(
  url: string,
  timeoutMs = 8000,
): Promise<Buffer | null> {
  const local = await tryReadLocalUploadFile(url);
  if (local) return local;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'VentaXLink-OGCollage/1.0' },
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function cellLayout(): { cw: number; ch: number; positions: { left: number; top: number }[] } {
  const cw = (OG_W - GUTTER * 3) / 2;
  const ch = (OG_H - GUTTER * 3) / 2;
  const positions = [
    { left: GUTTER, top: GUTTER },
    { left: GUTTER + cw + GUTTER, top: GUTTER },
    { left: GUTTER, top: GUTTER + ch + GUTTER },
    { left: GUTTER + cw + GUTTER, top: GUTTER + ch + GUTTER },
  ];
  return { cw: Math.floor(cw), ch: Math.floor(ch), positions };
}

/**
 * Decodifica sin depender de `file-type` (dynamic import a veces falla en algunos despliegues).
 */
async function decodeBufferToJimp(buf: Buffer) {
  if (!buf?.length) return null;
  try {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      const bmp = await jpegMod().decode(buf, {});
      return new Jimp(bmp);
    }
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const bmp = await pngMod().decode(buf, {});
      return new Jimp(bmp);
    }
  } catch {
    /* siguiente */
  }
  try {
    return await Jimp.read(buf);
  } catch {
    return null;
  }
}

async function renderCellJimp(buf: Buffer | null, cw: number, ch: number) {
  if (!buf?.length) {
    return new Jimp({ width: cw, height: ch, color: PLACEHOLDER_COLOR });
  }
  const img = await decodeBufferToJimp(buf);
  if (!img) {
    return new Jimp({ width: cw, height: ch, color: PLACEHOLDER_COLOR });
  }
  try {
    if (img.width > MAX_DECODE_EDGE || img.height > MAX_DECODE_EDGE) {
      img.scaleToFit({ w: MAX_DECODE_EDGE, h: MAX_DECODE_EDGE });
    }
    img.cover({ w: cw, h: ch });
    return img;
  } catch {
    return new Jimp({ width: cw, height: ch, color: PLACEHOLDER_COLOR });
  }
}

/**
 * Collage 2×2, 1200×630 (Jimp). Celdas en serie para menor pico de RAM en Railway.
 */
export async function buildOgCollagePng(
  slotBuffers: [Buffer | null, Buffer | null, Buffer | null, Buffer | null],
): Promise<Buffer> {
  const { cw, ch, positions } = cellLayout();
  const base = new Jimp({ width: OG_W, height: OG_H, color: BG_COLOR });
  for (let i = 0; i < 4; i++) {
    const cell = await renderCellJimp(slotBuffers[i], cw, ch);
    base.composite(cell, positions[i].left, positions[i].top);
  }
  const out = await base.getBuffer(JimpMime.png);
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
