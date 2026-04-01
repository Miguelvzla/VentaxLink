import { clearSession } from "./auth";
import { clearPlatformSession } from "./platform-session";

/** Asegura `/v1` para no llamar por error a `http://host:3001/coupons` (rompe el JSON). */
function normalizeApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").trim().replace(/\/+$/, "");
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

const base = normalizeApiBase();

export type AuthResponse = {
  access_token: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  short_desc: string | null;
  description: string | null;
  price: string;
  compare_price: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  tags: string[];
  primary_image_url: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
};

export type AdminOrder = {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  delivery_type: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  subtotal: string;
  total: string;
  shipping_cost: string;
  discount_amount: string;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  customer: { id: string; name: string; phone: string } | null;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
  }[];
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  total_orders: number;
  total_spent: string;
  last_order_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type AnalyticsSummary = {
  productCount: number;
  orderCount: number;
  customerCount: number;
  ordersInRange: number;
  rangeDays: number;
  /** Ranking de vistas de producto: solo planes Pro y Mayorista. */
  topProductViewsEnabled: boolean;
  eventsInRange: { event: string; count: number }[];
  topProductViews: { product_slug: string; views: number }[];
};

export type AnalyticsDashboardToday = {
  ordersToday: number;
  salesToday: string;
  avgTicketToday: string | null;
  customersNewToday: number;
};

export type TenantMe = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  phone: string;
  email: string | null;
  plan: string;
  status: string;
  whatsapp_number: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  google_maps_url: string | null;
  auto_whatsapp: boolean;
  /** true si hay clave CallMeBot propia o CALLMEBOT_API_KEY en el servidor */
  notify_whatsapp_configured: boolean;
  notify_customer_order_email: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_password_set: boolean;
  smtp_configured: boolean;
  points_enabled: boolean;
  points_ars_per_point: string | null;
  points_redeem_min_balance: number | null;
  points_redeem_percent: string | null;
  points_redeem_cost: number | null;
  created_at: string;
  plan_expires_at: string | null;
  billing_reminder_enabled: boolean;
  billing_reminder_day_of_month: number | null;
  billing_reminder_hour: number | null;
  billing_reminder_subject: string | null;
  billing_reminder_body: string | null;
  billing_payment_alias: string | null;
  last_billing_reminder_sent_at: string | null;
};

export type AdminCoupon = {
  id: string;
  code: string;
  description: string | null;
  percent: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  created_at: string;
};

function onUnauthorized() {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

function onPlatformUnauthorized() {
  clearPlatformSession();
  if (typeof window !== "undefined") {
    window.location.href = "/platform/login";
  }
}

export function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const o = body as { message?: unknown; error?: unknown };
    const m = o.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.join(". ");
    if (typeof o.error === "string" && o.error.length) return o.error;
  }
  return fallback;
}

async function readJsonResponse<T>(
  r: Response,
  fallback: string,
  on401?: () => void,
): Promise<T> {
  const text = await r.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* noop */
  }
  if (r.status === 401) {
    on401?.();
    throw new Error(
      on401 ? "Sesión vencida" : apiErrorMessage(json, "Credenciales incorrectas"),
    );
  }
  if (!r.ok) {
    throw new Error(apiErrorMessage(json, fallback));
  }
  if (text && json === null) {
    throw new Error(
      `La API no devolvió JSON válido. Comprobá NEXT_PUBLIC_API_URL (debe terminar en /v1, ej. http://localhost:3001/v1). Respuesta: ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`,
    );
  }
  return json as T;
}

export async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let r: Response;
  try {
    r = await fetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      mode: "cors",
    });
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "No se pudo conectar con la API (red, CORS o URL). Revisá NEXT_PUBLIC_API_URL y el deploy de la API."
        : e instanceof Error
          ? e.message
          : "Error de red";
    throw new Error(msg);
  }
  return readJsonResponse<T>(r, `Error ${r.status}`, onUnauthorized);
}

export async function getJson<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readJsonResponse<T>(r, `Error ${r.status}`, onUnauthorized);
}

export async function getJsonPlatform<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return readJsonResponse<T>(r, `Error ${r.status}`, onPlatformUnauthorized);
}

export async function patchJsonPlatform<T>(path: string, token: string, body: unknown): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readJsonResponse<T>(r, `Error ${r.status}`, onPlatformUnauthorized);
}

export async function patchJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readJsonResponse<T>(r, `Error ${r.status}`, onUnauthorized);
}

export async function deleteJson<T = { ok: boolean }>(path: string, token: string): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJsonResponse<T>(r, `Error ${r.status}`, onUnauthorized);
}

export async function postUploadProductImage(token: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${base}/uploads/product-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const fallback =
    r.status >= 500
      ? "Error al subir imagen (500). En Railway: revisá logs de la API, variable UPLOADS_DIR y GET /v1/health (uploads_writable)."
      : `Error ${r.status}`;
  return readJsonResponse<{ url: string }>(r, fallback, onUnauthorized);
}

export async function postUploadTenantLogo(token: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${base}/uploads/tenant-logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const fallback =
    r.status >= 500
      ? "Error al subir logo (500). En Railway: revisá logs de la API, UPLOADS_DIR y GET /v1/health (uploads_writable)."
      : `Error ${r.status}`;
  return readJsonResponse<{ url: string }>(r, fallback, onUnauthorized);
}

export async function postUploadTenantBanner(token: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${base}/uploads/tenant-banner`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const fallback =
    r.status >= 500
      ? "Error al subir banner (500). En Railway: revisá logs de la API, UPLOADS_DIR y GET /v1/health (uploads_writable)."
      : `Error ${r.status}`;
  return readJsonResponse<{ url: string }>(r, fallback, onUnauthorized);
}
