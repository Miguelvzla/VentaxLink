import { ProductCard } from "@/components/ProductCard";
import { StoreCatalogSearch } from "@/components/StoreCatalogSearch";
import {
  estimateProductPoints,
  fetchCategories,
  fetchProducts,
  fetchTenant,
} from "@/lib/api";
import { buildCatalogHref } from "@/lib/catalog-href";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string; featured?: string; new_only?: string; category?: string }>;
};

function truthyParam(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

export default async function ProductosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const featuredOnly = truthyParam(sp.featured);
  const newOnly = truthyParam(sp.new_only);
  const categorySlug = typeof sp.category === "string" ? sp.category : "";

  const [tenant, catalog, categories] = await Promise.all([
    fetchTenant(slug),
    fetchProducts(slug, page, 24, qRaw || null, {
      featuredOnly,
      newOnly,
      category: categorySlug || undefined,
    }),
    fetchCategories(slug),
  ]);

  if (!tenant || !catalog) return null;

  const { meta } = catalog;
  const hrefOpts = { q: qRaw, featured: featuredOnly, newOnly, category: categorySlug || undefined };
  const hasCatalogFilter = featuredOnly || newOnly || !!categorySlug;
  const manyProducts = meta.total > 10;
  const gridCatalog =
    manyProducts
      ? "grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

  const activeCategory = categories.find((c) => c.slug === categorySlug);

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
          {featuredOnly ? <span className="text-[#9CA3AF]"> · Solo destacados</span> : null}
          {newOnly ? <span className="text-[#9CA3AF]"> · Solo nuevos</span> : null}
          {activeCategory ? <span className="text-[#9CA3AF]"> · {activeCategory.name}</span> : null}
        </span>
        {qRaw.trim() || hasCatalogFilter ? (
          <a
            href={buildCatalogHref(slug)}
            className="font-medium hover:underline"
            style={{ color: tenant.primary_color }}
          >
            Quitar filtros
          </a>
        ) : null}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-[#9CA3AF] sm:w-auto sm:py-2">
          Filtrar
        </span>
        <a
          href={buildCatalogHref(slug, { q: qRaw })}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            !featuredOnly && !newOnly && !categorySlug
              ? "border-transparent text-white shadow-sm"
              : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
          }`}
          style={!featuredOnly && !newOnly && !categorySlug ? { backgroundColor: tenant.primary_color } : undefined}
        >
          Todos
        </a>
        <a
          href={buildCatalogHref(slug, { q: qRaw, featured: true })}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            featuredOnly
              ? "border-transparent text-white shadow-sm"
              : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
          }`}
          style={featuredOnly ? { backgroundColor: tenant.primary_color } : undefined}
        >
          Destacados
        </a>
        <a
          href={buildCatalogHref(slug, { q: qRaw, newOnly: true })}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            newOnly
              ? "border-transparent text-white shadow-sm"
              : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
          }`}
          style={newOnly ? { backgroundColor: tenant.primary_color } : undefined}
        >
          Nuevos
        </a>

        {/* Filtros de sección/categoría */}
        {categories.map((cat) => {
          const active = categorySlug === cat.slug;
          return (
            <a
              key={cat.id}
              href={buildCatalogHref(slug, { q: qRaw, category: active ? undefined : cat.slug })}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
              }`}
              style={active ? { backgroundColor: tenant.primary_color } : undefined}
            >
              {cat.name}
            </a>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-[#FAFAFA]/80 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-[#374151]">Buscar productos</p>
        <StoreCatalogSearch
          slug={slug}
          primaryColor={tenant.primary_color}
          defaultQuery={qRaw}
          preserveFeatured={featuredOnly}
          preserveNewOnly={newOnly}
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
                  href={buildCatalogHref(slug, { ...hrefOpts, page: page - 1 })}
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
                  href={buildCatalogHref(slug, { ...hrefOpts, page: page + 1 })}
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
