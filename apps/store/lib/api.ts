export function storeApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";
}

/** Origen de la API sin `/v1` (para armar URLs absolutas de OG / uploads). */
export function storeApiOrigin(): string {
  return storeApiBase().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

const apiBase = storeApiBase;

function rethrowIfApiUnreachable(e: unknown): never {
  if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
    const code = (e as { cause?: { code?: string } }).cause?.code;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") {
      throw new Error(
        "No se pudo conectar con la API. Verificá que esté en marcha (por ejemplo `npm run dev` en la raíz del repo; API en el puerto 3001).",
      );
    }
  }
  throw e;
}

export type PublicTenant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  phone: string;
  whatsapp_number: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  google_maps_url: string | null;
  address: string | null;
  schedule: unknown;
  status: string;
  plan: string;
  /** Programa de puntos (Pro / Mayorista) */
  points_enabled?: boolean;
  points_ars_per_point?: string | null;
  points_redeem_min_balance?: number | null;
  points_redeem_percent?: string | null;
  points_redeem_cost?: number | null;
  catalog_limited?: boolean;
  catalog_visible_cap?: number | null;
  catalog_total_products?: number | null;
  billing_hold_message?: string | null;
  billing_payment_alias?: string | null;
  /** Hash corto para ?v= en og:image (collage); cambia con el top-4 del catálogo. */
  og_preview_version?: string;
};

/** Puntos que equivalen al precio del producto (piso), si el programa está activo. */
export function estimateProductPoints(tenant: PublicTenant, price: string): number | null {
  if (tenant.points_enabled !== true || !tenant.points_ars_per_point) return null;
  const ars = Number(tenant.points_ars_per_point);
  const p = Number(price);
  if (!Number.isFinite(ars) || ars <= 0 || !Number.isFinite(p) || p <= 0) return null;
  const pts = Math.floor(p / ars);
  return pts > 0 ? pts : null;
}

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  short_desc: string | null;
  price: string;
  compare_price: string | null;
  is_featured: boolean;
  is_new: boolean;
  stock: number;
  track_stock: boolean;
  images: { url: string; alt: string | null; is_primary: boolean }[];
};

export async function fetchTenant(slug: string): Promise<PublicTenant | null> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/store/${slug}`, {
      /* Banner y logo se actualizan seguido desde el panel; evitamos caché larga. */
      cache: "no-store",
    });
  } catch (e) {
    rethrowIfApiUnreachable(e);
  }
  if (res.status === 404) return null;
  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 400);
    try {
      const j = JSON.parse(raw) as { message?: string };
      if (j.message) detail = j.message;
    } catch {
      /* cuerpo no JSON */
    }
    throw new Error(`API store: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  const json = JSON.parse(raw) as { data: PublicTenant };
  return json.data;
}

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_desc: string | null;
  price: string;
  compare_price: string | null;
  is_featured: boolean;
  is_new: boolean;
  stock: number;
  track_stock: boolean;
  weight: number | null;
  tags: string[];
  images: { id?: string; url: string; alt: string | null; is_primary: boolean; sort_order?: number }[];
  variants: {
    id: string;
    name: string;
    value: string;
    price_modifier: string;
    stock: number;
    sku: string | null;
  }[];
};

export async function fetchProduct(slug: string, pSlug: string) {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/store/${slug}/products/${pSlug}`, {
      next: { revalidate: 60 },
    });
  } catch (e) {
    rethrowIfApiUnreachable(e);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API product: ${res.status}`);
  return (await res.json()) as { data: ProductDetail };
}

export type FetchProductsFilters = {
  featuredOnly?: boolean;
  newOnly?: boolean;
};

export async function fetchProducts(
  slug: string,
  page = 1,
  limit = 24,
  search?: string | null,
  filters?: FetchProductsFilters,
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const s = search?.trim();
  if (s) q.set("q", s.slice(0, 120));
  if (filters?.featuredOnly) q.set("featured", "1");
  if (filters?.newOnly) q.set("new_only", "1");
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/store/${slug}/products?${q}`, {
      /* Orden del catálogo (sort_order) se edita en el panel; no cachear o la tienda queda desfasada. */
      cache: "no-store",
    });
  } catch (e) {
    rethrowIfApiUnreachable(e);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API products: ${res.status}`);
  return (await res.json()) as {
    data: ProductListItem[];
    meta: { total: number; page: number; limit: number; pages: number };
  };
}
