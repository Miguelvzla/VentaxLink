import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Canvas: 1200 × 630 (estándar OG)
const OG_W = 1200;
const OG_H = 630;
const G = 10; // gutter entre celdas

// 2 columnas × 2 filas — cada celda: 585 × 300
const CW = Math.floor((OG_W - G * 3) / 2);
const CH = Math.floor((OG_H - G * 3) / 2);
const BANNER_H = 62;

const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,78}$/;

function apiBase(): string {
  const r = process.env.PUBLIC_API_URL?.trim();
  if (r) return r.replace(/\/+$/, "").replace(/\/v1$/i, "") + "/v1";
  return (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1"
  ).replace(/\/+$/, "");
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
  if (!url) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "VentaXLink-OGImage/1.0" },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim();
    if (ct.startsWith("text/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** "$12.500" — puntos como separador de miles */
function formatPrice(raw: string): string {
  const n = Math.round(parseFloat(raw));
  if (isNaN(n)) return "";
  return "$" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Luminancia relativa (0–1) para decidir si texto encima va en blanco o negro */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
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

  type TenantData = {
    name: string;
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    description: string | null;
  };
  type Img = { url: string; is_primary: boolean };
  type ProductData = { name: string; price: string; images: Img[] };
  type ProductsResp = {
    data: ProductData[];
    meta: { total: number };
  };

  const [tenantResp, productsResp] = await Promise.all([
    fetchJsonSafe<{ data: TenantData }>(
      `${base}/store/${encodeURIComponent(slug)}`,
    ),
    fetchJsonSafe<ProductsResp>(
      `${base}/store/${encodeURIComponent(slug)}/products?limit=4&page=1`,
    ),
  ]);

  const storeName = tenantResp?.data?.name ?? slug;
  const primaryColor =
    tenantResp?.data?.primary_color?.trim() || "#22C55E";
  const logoUrl = tenantResp?.data?.logo_url ?? null;
  const totalProducts = productsResp?.meta?.total ?? 0;

  // Top 4 productos con su imagen y precio
  const products = (productsResp?.data ?? []).slice(0, 4);
  while (products.length < 4) {
    products.push({ name: "", price: "", images: [] });
  }

  // Imágenes del logo + 4 productos en paralelo
  const [logoUri, ...productUris] = await Promise.all([
    logoUrl ? fetchAsDataUri(logoUrl) : Promise.resolve(null),
    ...products.map((p) => {
      const img = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
      return img?.url ? fetchAsDataUri(img.url) : Promise.resolve(null);
    }),
  ]);

  // Color de texto sobre el primary (blanco si es oscuro, negro si es claro)
  const primaryTextColor = luminance(primaryColor) > 0.35 ? "#111111" : "#ffffff";

  // Celda individual 585×300
  function Cell({
    uri,
    price,
    idx,
  }: {
    uri: string | null;
    price: string;
    idx: number;
  }) {
    const priceLabel = price ? formatPrice(price) : null;

    return (
      <div
        key={idx}
        style={{
          position: "relative",
          display: "flex",
          width: CW,
          height: CH,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "#2a2a2e",
          borderRadius: 6,
        }}
      >
        {/* Imagen de producto */}
        {uri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uri}
            width={CW}
            height={CH}
            alt=""
            style={{
              objectFit: "cover",
              objectPosition: "center",
              width: CW,
              height: CH,
            }}
          />
        )}

        {/* Gradiente oscuro en la parte inferior (para legibilidad del precio) */}
        {priceLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: CW,
              height: 80,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            }}
          />
        )}

        {/* Badge de precio */}
        {priceLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 14,
              display: "flex",
              alignItems: "center",
              backgroundColor: primaryColor,
              borderRadius: 20,
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 14,
              paddingRight: 14,
            }}
          >
            <span
              style={{
                color: primaryTextColor,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              {priceLabel}
            </span>
          </div>
        )}
      </div>
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
          backgroundColor: "#18181b",
          padding: G,
          gap: G,
          position: "relative",
        }}
      >
        {/* Fila superior */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: G,
            height: CH,
          }}
        >
          <Cell uri={productUris[0] ?? null} price={products[0]?.price ?? ""} idx={0} />
          <Cell uri={productUris[1] ?? null} price={products[1]?.price ?? ""} idx={1} />
        </div>

        {/* Fila inferior */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: G,
            height: CH,
          }}
        >
          <Cell uri={productUris[2] ?? null} price={products[2]?.price ?? ""} idx={2} />
          <Cell uri={productUris[3] ?? null} price={products[3]?.price ?? ""} idx={3} />
        </div>

        {/* ── Banner inferior ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: OG_W,
            height: BANNER_H,
            backgroundColor: "rgba(0,0,0,0.72)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 22,
            paddingRight: 22,
          }}
        >
          {/* Logo + nombre */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Logo (si existe) */}
            {logoUri && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUri}
                  width={36}
                  height={36}
                  alt=""
                  style={{ objectFit: "contain" }}
                />
              </div>
            )}
            <span
              style={{
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}
            >
              {storeName}
            </span>
          </div>

          {/* Total de productos + marca */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            {totalProducts > 0 && (
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {totalProducts} producto{totalProducts !== 1 ? "s" : ""}
              </span>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: primaryColor,
                borderRadius: 20,
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 14,
                paddingRight: 14,
              }}
            >
              <span
                style={{
                  color: primaryTextColor,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.3px",
                }}
              >
                VentaXLink
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: OG_W, height: OG_H },
  );

  const headers = new Headers(resp.headers);
  headers.set(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400",
  );
  return new Response(resp.body, { status: 200, headers });
}
