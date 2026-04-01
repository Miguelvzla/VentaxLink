import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { StoreCatalogSearch } from "@/components/StoreCatalogSearch";
import { estimateProductPoints, fetchProducts, fetchTenant } from "@/lib/api";

export default async function TiendaHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tenant, catalog] = await Promise.all([fetchTenant(slug), fetchProducts(slug, 1, 8)]);

  if (!tenant || !catalog) return null;

  const manyProducts = catalog.meta.total > 10;
  const gridHome =
    manyProducts
      ? "grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
      : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-gray-100 bg-[#FAFAFA]/80 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-[#374151]">Buscar productos</p>
        <StoreCatalogSearch slug={slug} primaryColor={tenant.primary_color} id="store-home-search" />
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-[#111827]">Destacados</h2>
          <Link
            href={`/tienda/${slug}/productos`}
            className="text-sm font-semibold hover:underline"
            style={{ color: tenant.primary_color }}
          >
            Ver catálogo →
          </Link>
        </div>
        {catalog.data.length === 0 ? (
          <p className="mt-4 text-sm text-[#9CA3AF]">Aún no hay productos en esta tienda.</p>
        ) : (
          <ul className={`mt-6 ${gridHome}`}>
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
      </section>
    </div>
  );
}
