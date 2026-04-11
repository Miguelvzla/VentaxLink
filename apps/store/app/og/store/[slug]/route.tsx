import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OG_W = 1200;
const OG_H = 630;
const GUTTER = 16;
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,78}$/;

function apiBase(): string {
  // PUBLIC_API_URL: runtime (Railway). NEXT_PUBLIC_API_URL: baked at build.
  const r = process.env.PUBLIC_API_URL?.trim();
  if (r) return r.replace(/\/+$/, "").replace(/\/v1$/i, "") + "/v1";
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1").replace(/\/+$/, "");
}

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "VentaXLink-OGImage/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "VentaXLink-OGImage/1.0" },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (ct.startsWith("text/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!slug || !SLUG_RE.test(slug)) {
    return new Response(null, { status: 400 });
  }

  const base = apiBase();

  type TenantData = { name: string; description: string | null; primary_color: string };
  type ProductData = { images: { url: string; is_primary: boolean }[] };

  const [tenantResp, productsResp] = await Promise.all([
    fetchJsonSafe<{ data: TenantData }>(`${base}/store/${encodeURIComponent(slug)}`),
    fetchJsonSafe<{ data: ProductData[] }>(`${base}/store/${encodeURIComponent(slug)}/products?limit=8`),
  ]);

  const storeName = tenantResp?.data?.name ?? slug;
  const primaryColor = tenantResp?.data?.primary_color ?? "#22C55E";

  const imageUrls: string[] = [];
  for (const p of productsResp?.data ?? []) {
    if (imageUrls.length >= 4) break;
    const img =
      p.images?.find((i) => i.is_primary) ?? p.images?.[0];
    if (img?.url) imageUrls.push(img.url);
  }
  while (imageUrls.length < 4) imageUrls.push("");

  const dataUris = await Promise.all(
    imageUrls.map((u) => (u ? fetchAsDataUri(u) : Promise.resolve(null))),
  );

  const cw = Math.floor((OG_W - GUTTER * 3) / 2);
  const ch = Math.floor((OG_H - GUTTER * 3) / 2);

  const positions = [
    { left: GUTTER,          top: GUTTER },
    { left: GUTTER * 2 + cw, top: GUTTER },
    { left: GUTTER,          top: GUTTER * 2 + ch },
    { left: GUTTER * 2 + cw, top: GUTTER * 2 + ch },
  ];

  const image = new ImageResponse(
    (
      <div
        style={{
          width: OG_W,
          height: OG_H,
          display: "flex",
          position: "relative",
          backgroundColor: "#e8e8ea",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {positions.map((pos, i) =>
          dataUris[i] ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                width: cw,
                height: ch,
                backgroundImage: `url(${dataUris[i]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                width: cw,
                height: ch,
                backgroundColor: "#d4d4d8",
              }}
            />
          ),
        )}

        {/* Franja inferior con nombre de tienda */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 32,
            paddingRight: 32,
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            {storeName}
          </span>
          <span
            style={{
              color: primaryColor,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            VentaXLink
          </span>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  );

  // Añadir cache headers (ImageResponse no los trae por defecto)
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return new Response(image.body, { status: 200, headers });
}
