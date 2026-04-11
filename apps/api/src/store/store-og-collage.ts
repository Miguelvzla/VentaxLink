import * as crypto from 'crypto';
import { readFile } from 'fs/promises';
import { join, normalize, resolve as pathResolve, sep } from 'path';
import sharp from 'sharp';
import { getPublicApiOrigin } from '../uploads/public-asset-url';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';
import { resolveUploadsRoot } from '../uploads/uploads-path';

const OG_W = 1200;
const OG_H = 630;
const GUTTER = 12;
const PLACEHOLDER = { r: 212, g: 212, b: 216 } as const;
const BG = { r: 232, g: 232, b: 234 } as const;

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

/**
 * Si la URL es de uploads en este mismo host, leemos del disco (evita HTTP a través de Cloudflare
 * y HTML de desafío que rompe Sharp).
 */
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

async function renderCell(
  buf: Buffer | null,
  cw: number,
  ch: number,
): Promise<Buffer> {
  if (buf) {
    try {
      return await sharp(buf)
        .rotate()
        .resize(cw, ch, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();
    } catch {
      /* fallthrough placeholder */
    }
  }
  return sharp({
    create: {
      width: cw,
      height: ch,
      channels: 3,
      background: PLACEHOLDER,
    },
  })
    .png()
    .toBuffer();
}

/**
 * Collage 2×2, 1200×630, gutter, fondo neutro.
 * Sin marca SVG: en Linux sin librsvg, `composite` con SVG rompe y la API devolvía 500.
 */
export async function buildOgCollagePng(
  slotBuffers: [Buffer | null, Buffer | null, Buffer | null, Buffer | null],
): Promise<Buffer> {
  const { cw, ch, positions } = cellLayout();
  const cells = await Promise.all(
    slotBuffers.map((b) => renderCell(b, cw, ch)),
  );

  const base = sharp({
    create: {
      width: OG_W,
      height: OG_H,
      channels: 3,
      background: BG,
    },
  });

  const composites: sharp.OverlayOptions[] = positions.map((pos, i) => ({
    input: cells[i],
    left: pos.left,
    top: pos.top,
  }));

  return base.composite(composites).png({ compressionLevel: 9 }).toBuffer();
}
