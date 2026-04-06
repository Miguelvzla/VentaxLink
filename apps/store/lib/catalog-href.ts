/** Construye href del catálogo con paginación, búsqueda y filtros (GET). */
export function buildCatalogHref(
  slug: string,
  opts: {
    page?: number;
    q?: string;
    featured?: boolean;
    newOnly?: boolean;
  } = {},
): string {
  const p = new URLSearchParams();
  if (opts.page != null && opts.page > 1) p.set("page", String(opts.page));
  const qs = opts.q?.trim();
  if (qs) p.set("q", qs.slice(0, 120));
  if (opts.featured) p.set("featured", "1");
  if (opts.newOnly) p.set("new_only", "1");
  const s = p.toString();
  return s ? `/tienda/${slug}/productos?${s}` : `/tienda/${slug}/productos`;
}
