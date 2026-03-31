/**
 * URL base pública de la tienda (`.../tienda`), para previews en el admin.
 * - Si NEXT_PUBLIC_STORE_URL está definida y no es solo localhost, se usa.
 * - Si el admin se sirve en admin.<dominio>, se asume la tienda en https://store.<dominio>/tienda
 * - Si no, fallback a NEXT_PUBLIC_STORE_ORIGIN + /tienda o localhost en desarrollo.
 */
export function resolveStorePublicBase(hostHeader: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_STORE_URL?.trim()?.replace(/\/+$/, "");
  if (envUrl && !/^https?:\/\/localhost(?::\d+)?\b/i.test(envUrl)) {
    return envUrl;
  }

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
