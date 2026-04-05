/**
 * URLs públicas de archivos bajo /v1/uploads/…
 *
 * PUBLIC_API_URL debe ser el origen sin /v1 (ej. https://api.tudominio.com).
 * Si se copia por error NEXT_PUBLIC_API_URL con /v1, lo quitamos para no generar …/v1/v1/uploads/…
 */
export function getPublicApiOrigin(): string | null {
  const raw = process.env.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return null;
  return raw.replace(/\/v1$/i, '');
}

export function buildUploadsPublicUrl(
  rel: string,
  reqFallback: { protocol: string; get: (h: string) => string | undefined },
): string {
  const clean = rel.replace(/^\/+/, '');
  const origin = getPublicApiOrigin();
  const base =
    origin ||
    `${reqFallback.protocol}://${reqFallback.get('host') ?? ''}`.replace(
      /\/+$/,
      '',
    );
  return `${base}/v1/uploads/${clean}`;
}

/**
 * Valor a guardar en DB: solo ruta bajo la API. Así un cambio de dominio (Railway, custom domain)
 * no deja URLs rotas; la API y los front reconstruyen la URL absoluta con PUBLIC_API_URL.
 */
export function buildUploadsStoredPath(rel: string): string {
  const clean = rel.replace(/^\/+/, '');
  return `/v1/uploads/${clean}`;
}

/**
 * Reescribe URLs propias de uploads al origen actual de la API.
 * URLs externas (Imgur, etc.) se dejan igual.
 */
export function rewriteStoredUploadsUrl(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const origin = getPublicApiOrigin();
  if (!origin) return trimmed;

  const fixDoubleV1 = trimmed.match(/\/v1\/v1\/uploads\/(.+)$/);
  if (fixDoubleV1) {
    return `${origin}/v1/uploads/${fixDoubleV1[1]}`;
  }

  const m = trimmed.match(/\/v1\/uploads\/(.+)$/);
  if (m) {
    return `${origin}/v1/uploads/${m[1]}`;
  }

  if (trimmed.startsWith('/v1/uploads/')) {
    return `${origin}${trimmed}`;
  }

  /** Path relativo sin host (algunos proxies / clientes antiguos). */
  if (trimmed.startsWith('v1/uploads/')) {
    return `${origin}/${trimmed}`;
  }

  return trimmed;
}
