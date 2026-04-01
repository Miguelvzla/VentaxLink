export function storeApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";
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
  /** true si la API tiene ENABLE_STORE_SMTP_TEST (botón de prueba SMTP) */
  mail_test_available?: boolean;
};

function nestErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const m = (body as { message?: unknown }).message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m) && m.length && typeof m[0] === "string") return m[0];
  return fallback;
}

export type MailTestResponse = {
  ok: boolean;
  message: string;
  to_hint?: string;
};

/** POST prueba SMTP (solo Pro/Mayorista; requiere ENABLE_STORE_SMTP_TEST en la API). */
export async function postStoreMailTest(slug: string): Promise<MailTestResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/store/${slug}/mail-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch (e) {
    rethrowIfApiUnreachable(e);
  }
  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    /* cuerpo no JSON */
  }
  if (!res.ok) {
    const detail = nestErrorMessage(parsed, raw.slice(0, 280) || `Error ${res.status}`);
    throw new Error(detail);
  }
  const j = parsed as MailTestResponse;
  if (!j || typeof j !== "object" || j.ok !== true) {
    throw new Error("Respuesta inesperada de la API");
  }
  return j;
}

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

export async function fetchProducts(
  slug: string,
  page = 1,
  limit = 24,
  search?: string | null,
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const s = search?.trim();
  if (s) q.set("q", s.slice(0, 120));
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/store/${slug}/products?${q}`, {
      next: { revalidate: 30 },
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
