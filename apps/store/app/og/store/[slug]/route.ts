import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,78}$/i;

function apiOriginForOgProxy(): string {
  const fromPublic = process.env.PUBLIC_API_URL?.trim();
  if (fromPublic) {
    return fromPublic.replace(/\/+$/, "").replace(/\/v1$/i, "");
  }
  const n = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001/v1";
  return n.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/**
 * Proxy del collage OG por el mismo dominio que la tienda pública.
 * Así WhatsApp/Meta piden la imagen a store.* (siempre HTTPS del link compartido)
 * y el servidor resuelve la API con `PUBLIC_API_URL` en runtime (Railway).
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!slug || !SLUG_RE.test(slug)) {
    return new NextResponse(null, { status: 400 });
  }
  const v = new URL(req.url).searchParams.get("v");
  const origin = apiOriginForOgProxy();
  const upstream = `${origin}/v1/store/${encodeURIComponent(slug)}/og-collage.png${v ? `?v=${encodeURIComponent(v)}` : ""}`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      redirect: "follow",
      headers: {
        Accept: "image/png,*/*",
        "User-Agent": "VentaXLink-Store-OGProxy/1.0",
      },
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!upstreamRes.ok) {
    return new NextResponse(null, {
      status: upstreamRes.status === 404 ? 404 : 502,
    });
  }

  const buf = await upstreamRes.arrayBuffer();
  const headers = new Headers();
  headers.set("Content-Type", "image/png");
  headers.set(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400",
  );
  const etag = upstreamRes.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  return new NextResponse(buf, { status: 200, headers });
}
