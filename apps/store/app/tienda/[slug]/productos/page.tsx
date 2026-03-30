import { ProductCard } from "@/components/ProductCard";
import { estimateProductPoints, fetchProducts, fetchTenant } from "@/lib/api";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ProductosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [tenant, catalog] = await Promise.all([fetchTenant(slug), fetchProducts(slug, page, 24)]);

  if (!tenant || !catalog) return null;

  const { meta } = catalog;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[#111827]">Productos</h1>
      <p className="mt-1 text-sm text-[#6B7280]">
        {meta.total} {meta.total === 1 ? "producto" : "productos"}
      </p>

      {catalog.data.length === 0 ? (
        <p className="mt-8 text-center text-[#9CA3AF]">No hay productos para mostrar.</p>
      ) : (
        <>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  href={`/tienda/${slug}/productos?page=${page - 1}`}
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
                  href={`/tienda/${slug}/productos?page=${page + 1}`}
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
