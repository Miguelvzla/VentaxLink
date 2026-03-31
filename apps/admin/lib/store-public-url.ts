/**
 * URL base pública de la tienda (`.../tienda`), para previews en el admin.
 * Orden: STORE_URL (no localhost) → derivar desde NEXT_PUBLIC_ADMIN_URL (admin.* → store.*)
 * → host de la petición → fallbacks locales.
 */
function storeBaseFromAdminUrlEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const h = u.hostname.toLowerCase();
    if (h.startsWith("admin.")) {
      return `https://store.${h.slice("admin.".length)}/tienda`;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveStorePublicBase(hostHeader: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_STORE_URL?.trim()?.replace(/\/+$/, "");
  if (envUrl && !/^https?:\/\/localhost(?::\d+)?\b/i.test(envUrl)) {
    return envUrl;
  }

  const fromAdmin = storeBaseFromAdminUrlEnv();
  if (fromAdmin) return fromAdmin;

  const host =
    (hostHeader ?? "")
      .split(",")[0]
      ?.trim()
      .split(":")[0]
      ?.toLowerCase() ?? "";
  const m = host.match(/^admin\.(.+)$/);
  if (m?.[1]) {
    return `https://store.${m[1]}/tienda`;
  }

  if (envUrl) return envUrl;
  const origin = (process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003").replace(
    /\/+$/,
    "",
  );
  return `${origin}/tienda`;
}
