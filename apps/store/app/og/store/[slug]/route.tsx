import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OG_W = 1200;
const OG_H = 630;
const G = 12; // gutter px

/* Celdas 2×2 con gutter:
   CW = (1200 - 3*12) / 2 = 582
   CH = (630  - 3*12) / 2 = 297   */
const CW = (OG_W - G * 3) / 2; // 582
const CH = (OG_H - G * 3) / 2; // 297
const BANNER_H = 58;

const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,78}$/;

function apiBase(): string {
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

  type TenantData = { name: string; primary_color: string };
  type Img = { url: string; is_primary: boolean };
  type ProductData = { images: Img[] };

  const [tenantResp, productsResp] = await Promise.all([
    fetchJsonSafe<{ data: TenantData }>(`${base}/store/${encodeURIComponent(slug)}`),
    fetchJsonSafe<{ data: ProductData[] }>(
      `${base}/store/${encodeURIComponent(slug)}/products?limit=8`,
    ),
  ]);

  const storeName = tenantResp?.data?.name ?? slug;
  const primaryColor = tenantResp?.data?.primary_color ?? "#22C55E";

  const imageUrls: string[] = [];
  for (const p of productsResp?.data ?? []) {
    if (imageUrls.length >= 4) break;
    const img = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
    if (img?.url) imageUrls.push(img.url);
  }
  while (imageUrls.length < 4) imageUrls.push("");

  const uris = await Promise.all(
    imageUrls.map((u) => (u ? fetchAsDataUri(u) : Promise.resolve(null))),
  );

  function cell(uri: string | null, key: number) {
    const base: React.CSSProperties = {
      width: CW,
      height: CH,
      flexShrink: 0,
    };
    if (!uri) {
      return <div key={key} style={{ ...base, backgroundColor: "#d4d4d8" }} />;
    }
    return (
      <div
        key={key}
        style={{
          ...base,
          backgroundImage: `url(${uri})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  const resp = new ImageResponse(
    (
      <div
        style={{
          width: OG_W,
          height: OG_H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#e8e8ea",
          padding: G,
          gap: G,
          position: "relative",
        }}
      >
        {/* Fila superior */}
        <div style={{ display: "flex", flexDirection: "row", gap: G, height: CH }}>
          {cell(uris[0], 0)}
          {cell(uris[1], 1)}
        </div>

        {/* Fila inferior */}
        <div style={{ display: "flex", flexDirection: "row", gap: G, height: CH }}>
          {cell(uris[2], 2)}
          {cell(uris[3], 3)}
        </div>

        {/* Franja inferior con nombre */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: OG_W,
            height: BANNER_H,
            backgroundColor: "rgba(0,0,0,0.58)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 28,
            paddingRight: 28,
          }}
        >
          <span style={{ color: "#ffffff", fontSize: 30, fontWeight: 700 }}>
            {storeName}
          </span>
          <span style={{ color: primaryColor, fontSize: 20, fontWeight: 600 }}>
            VentaXLink
          </span>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  );

  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return new Response(resp.body, { status: 200, headers });
}
