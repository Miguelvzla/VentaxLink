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
  searchParams: Promise<{ q?: string; featured?: string; new_only?: string; category?: string }>;
};

function truthyParam(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

export default async function TiendaHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const featuredOnly = truthyParam(sp.featured);
  const newOnly = truthyParam(sp.new_only);
  const categorySlug = typeof sp.category === "string" ? sp.category : "";

  const [tenant, catalog, categories] = await Promise.all([
    fetchTenant(slug),
    fetchProducts(slug, 1, 24, qRaw || null, {
      featuredOnly,
      newOnly,
      category: categorySlug || undefined,
    }),
    fetchCategories(slug),
  ]);

  if (!tenant || !catalog) return null;

  const { meta } = catalog;
  const hasFilter = featuredOnly || newOnly || !!categorySlug;
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  // 2 columnas en mobile cuando hay más de 10 productos
  const gridClass =
    meta.total > 10
      ? "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"
      : "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4";

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <section className="rounded-2xl border border-gray-100 bg-[#FAFAFA]/80 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-[#374151]">Buscar productos</p>
        <StoreCatalogSearch
          slug={slug}
          primaryColor={tenant.primary_color}
          defaultQuery={qRaw}
          preserveFeatured={featuredOnly}
          preserveNewOnly={newOnly}
          id="store-home-search"
        />
      </section>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-[#9CA3AF] sm:w-auto sm:py-2">
          Filtrar
        </span>
        <a
          href={`/tienda/${slug}${qRaw ? `?q=${encodeURIComponent(qRaw)}` : ""}`}
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
          href={`/tienda/${slug}?featured=1${qRaw ? `&q=${encodeURIComponent(qRaw)}` : ""}`}
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
          href={`/tienda/${slug}?new_only=1${qRaw ? `&q=${encodeURIComponent(qRaw)}` : ""}`}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            newOnly
              ? "border-transparent text-white shadow-sm"
              : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
          }`}
          style={newOnly ? { backgroundColor: tenant.primary_color } : undefined}
        >
          Nuevos
        </a>

        {categories.map((cat) => {
          const active = categorySlug === cat.slug;
          return (
            <a
              key={cat.id}
              href={`/tienda/${slug}?category=${encodeURIComponent(active ? "" : cat.slug)}${qRaw ? `&q=${encodeURIComponent(qRaw)}` : ""}`}
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

      {/* Resumen */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#6B7280]">
        <span>
          {meta.total} {meta.total === 1 ? "producto" : "productos"}
          {qRaw.trim() ? (
            <span className="text-[#9CA3AF]"> · «{qRaw.trim().slice(0, 60)}{qRaw.trim().length > 60 ? "…" : ""}»</span>
          ) : null}
          {featuredOnly ? <span className="text-[#9CA3AF]"> · Destacados</span> : null}
          {newOnly ? <span className="text-[#9CA3AF]"> · Nuevos</span> : null}
          {activeCategory ? <span className="text-[#9CA3AF]"> · {activeCategory.name}</span> : null}
        </span>
        {(qRaw.trim() || hasFilter) && (
          <a
            href={`/tienda/${slug}`}
            className="font-medium hover:underline"
            style={{ color: tenant.primary_color }}
          >
            Quitar filtros
          </a>
        )}
      </p>

      {/* Grilla de productos */}
      {catalog.data.length === 0 ? (
        <p className="py-12 text-center text-[#9CA3AF]">
          {qRaw.trim() ? "No hay resultados para esa búsqueda." : "No hay productos para mostrar."}
        </p>
      ) : (
        <ul className={gridClass}>
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
      )}

      {/* Ver catálogo completo */}
      {meta.total > 24 && (
        <div className="flex justify-center pt-2">
          <a
            href={buildCatalogHref(slug, { q: qRaw || undefined, featured: featuredOnly, newOnly, category: categorySlug || undefined })}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-gray-50"
          >
            Ver todos los productos →
          </a>
        </div>
      )}
    </div>
  );
}
