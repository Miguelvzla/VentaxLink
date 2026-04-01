import { ProductCard } from "@/components/ProductCard";
import { StoreCatalogSearch } from "@/components/StoreCatalogSearch";
import { estimateProductPoints, fetchProducts, fetchTenant } from "@/lib/api";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

function buildPageHref(slug: string, pageNum: number, q?: string) {
  const p = new URLSearchParams();
  if (pageNum > 1) p.set("page", String(pageNum));
  const qs = q?.trim();
  if (qs) p.set("q", qs.slice(0, 120));
  const s = p.toString();
  return s ? `/tienda/${slug}/productos?${s}` : `/tienda/${slug}/productos`;
}

export default async function ProductosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const [tenant, catalog] = await Promise.all([
    fetchTenant(slug),
    fetchProducts(slug, page, 24, qRaw || null),
  ]);

  if (!tenant || !catalog) return null;

  const { meta } = catalog;
  const manyProducts = meta.total > 10;
  const gridCatalog =
    manyProducts
      ? "grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[#111827]">Productos</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#6B7280]">
        <span>
          {meta.total} {meta.total === 1 ? "producto" : "productos"}
          {qRaw.trim() ? (
            <span className="text-[#9CA3AF]">
              {" "}
              · «{qRaw.trim().slice(0, 80)}
              {qRaw.trim().length > 80 ? "…" : ""}»
            </span>
          ) : null}
        </span>
        {qRaw.trim() ? (
          <a href={`/tienda/${slug}/productos`} className="font-medium hover:underline" style={{ color: tenant.primary_color }}>
            Quitar filtro
          </a>
        ) : null}
      </p>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-[#FAFAFA]/80 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-[#374151]">Buscar productos</p>
        <StoreCatalogSearch
          slug={slug}
          primaryColor={tenant.primary_color}
          defaultQuery={qRaw}
          id="store-catalog-page-search"
        />
      </div>

      {catalog.data.length === 0 ? (
        <p className="mt-8 text-center text-[#9CA3AF]">
          {qRaw.trim() ? "No hay resultados para esa búsqueda." : "No hay productos para mostrar."}
        </p>
      ) : (
        <>
          <ul className={`mt-8 ${gridCatalog}`}>
            {catalog.data.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  slug={slug}
                  primaryColor={tenant.primary_color}
                  pointsEarned={estimateProductPoints(tenant, p.price)}
                />
              </li>
            ))}
          </ul>
          {meta.pages > 1 ? (
            <nav className="mt-10 flex justify-center gap-4 text-sm">
              {page > 1 ? (
                <a
                  href={buildPageHref(slug, page - 1, qRaw)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-medium hover:bg-gray-50"
                >
                  Anterior
                </a>
              ) : null}
              <span className="py-2 text-[#9CA3AF]">
                Página {page} de {meta.pages}
              </span>
              {page < meta.pages ? (
                <a
                  href={buildPageHref(slug, page + 1, qRaw)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-medium hover:bg-gray-50"
                >
                  Siguiente
                </a>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
