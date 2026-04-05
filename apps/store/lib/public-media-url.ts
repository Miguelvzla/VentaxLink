/**
 * URLs de uploads guardadas como `/v1/uploads/…` deben cargarse desde el origen de la API, no del storefront.
 */
export function resolvePublicMediaUrl(url: string | null | undefined): string {
  if (url == null) return "";
  const t = String(url).trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").trim().replace(/\/+$/, "");
  const origin = raw.replace(/\/v1$/i, "");
  if (t.startsWith("/v1/uploads/")) return `${origin}${t}`;
  if (t.startsWith("v1/uploads/")) return `${origin}/${t}`;
  return t;
}
