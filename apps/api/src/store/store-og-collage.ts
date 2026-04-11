import * as crypto from 'crypto';
import sharp from 'sharp';
import { getPublicApiOrigin } from '../uploads/public-asset-url';
import { rewriteStoredUploadsUrl } from '../uploads/public-asset-url';

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

export async function fetchImageBuffer(
  url: string,
  timeoutMs = 8000,
): Promise<Buffer | null> {
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

function watermarkPng(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width - 16}" y="${height - 14}" text-anchor="end" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="rgba(17,24,39,0.14)">VentaXLink</text>
</svg>`;
  return Buffer.from(svg);
}

/**
 * Collage 2×2, 1200×630, gutter, fondo neutro, marca de agua opcional.
 */
export async function buildOgCollagePng(
  slotBuffers: [Buffer | null, Buffer | null, Buffer | null, Buffer | null],
  options?: { watermark?: boolean },
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

  if (options?.watermark !== false) {
    composites.push({
      input: watermarkPng(OG_W, OG_H),
      left: 0,
      top: 0,
    });
  }

  return base.composite(composites).png({ compressionLevel: 9 }).toBuffer();
}
