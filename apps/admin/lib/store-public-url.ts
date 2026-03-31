/**
 * URL base pública de la tienda (`.../tienda`), para previews en el admin.
 *
 * Importante: `NEXT_PUBLIC_*` se congela en el **build**. En Railway, si no inyectás esas vars
 * al compilar, seguirás viendo localhost. Por eso la prioridad 1 es `STORE_PUBLIC_BASE`
 * (solo servidor, se lee en cada request en runtime).
 */
function trimBase(s: string | undefined): string | null {
  const t = s?.trim()?.replace(/\/+$/, "");
  return t || null;
}

export function resolveStorePublicBase(hostHeader: string | null): string {
  const runtimeBase = trimBase(process.env.STORE_PUBLIC_BASE);
  if (runtimeBase) return runtimeBase;

  const envUrl = trimBase(process.env.NEXT_PUBLIC_STORE_URL);
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

function storeBaseFromAdminUrlEnv(): string | null {
  const raw =
    process.env.ADMIN_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
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
