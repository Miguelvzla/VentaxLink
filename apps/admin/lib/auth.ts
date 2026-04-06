export const TOKEN_KEY = "ventaxlink_access_token";
export const TENANT_KEY = "ventaxlink_tenant";

/** Cookie compartida (subdominios) para que la tienda pública detecte al dueño. Mismo nombre en `StoreOwnerDashboardLink`. */
export const OWNER_TENANT_SLUG_COOKIE = "ventaxlink_tenant_slug";

function setOwnerTenantSlugCookie(slug: string) {
  if (typeof window === "undefined") return;
  const domain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim();
  let c = `${OWNER_TENANT_SLUG_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  if (domain) c += `; Domain=${domain}`;
  if (window.location.protocol === "https:") c += "; Secure";
  document.cookie = c;
}

function clearOwnerTenantSlugCookie() {
  if (typeof window === "undefined") return;
  const domain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim();
  let c = `${OWNER_TENANT_SLUG_COOKIE}=; Path=/; Max-Age=0`;
  if (domain) c += `; Domain=${domain}`;
  document.cookie = c;
}

export type StoredTenant = {
  id: string;
  slug: string;
  name: string;
  plan: string;
};

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
  clearOwnerTenantSlugCookie();
}

export function saveSession(payload: {
  access_token: string;
  tenant: StoredTenant;
}): void {
  localStorage.setItem(TOKEN_KEY, payload.access_token);
  localStorage.setItem(TENANT_KEY, JSON.stringify(payload.tenant));
  setOwnerTenantSlugCookie(payload.tenant.slug);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  t = t.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (typeof parsed === "string") return parsed.trim() || null;
    } catch {
      t = t.slice(1, -1).trim();
    }
  }
  return t || null;
}

export function getStoredTenant(): StoredTenant | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTenant;
  } catch {
    return null;
  }
}

export function mergeStoredTenant(partial: Partial<StoredTenant>): void {
  const cur = getStoredTenant();
  if (!cur) return;
  localStorage.setItem(TENANT_KEY, JSON.stringify({ ...cur, ...partial }));
}
