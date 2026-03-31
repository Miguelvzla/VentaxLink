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
  const runtimeBase =
    trimBase(process.env.STORE_PUBLIC_BASE) ||
    trimBase(process.env.STORE_PUBLIC_BASE_URL);
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

  // Host vacío o interno (proxy Railway a veces no envía el dominio público al SSR)
  const hostLooksInternal =
    !host ||
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith(".railway.internal");
  if (
    hostLooksInternal &&
    process.env.NODE_ENV === "production" &&
    (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID)
  ) {
    return "https://store.ventaxlink.ar/tienda";
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
