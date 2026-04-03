import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { StoreCatalogSearch } from "@/components/StoreCatalogSearch";
import {
  estimateProductPoints,
  fetchProducts,
  fetchTenant,
  type ProductListItem,
  type PublicTenant,
} from "@/lib/api";

function productGridClass(itemCount: number) {
  return itemCount > 10
    ? "grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
    : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4";
}

function ProductGrid({
  slug,
  tenant,
  products,
}: {
  slug: string;
  tenant: PublicTenant;
  products: ProductListItem[];
}) {
  return (
    <ul className={`mt-6 ${productGridClass(products.length)}`}>
      {products.map((p) => (
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
  );
}

export default async function TiendaHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tenant, featuredRes, newRes, allRes] = await Promise.all([
    fetchTenant(slug),
    fetchProducts(slug, 1, 24, null, { featuredOnly: true }),
    fetchProducts(slug, 1, 24, null, { newOnly: true }),
    fetchProducts(slug, 1, 12, null),
  ]);

  if (!tenant || !allRes) return null;

  const featured = featuredRes?.data ?? [];
  const nuevos = newRes?.data ?? [];
  const tienda = allRes.data;
  const hasAnyProducts = allRes.meta.total > 0;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-gray-100 bg-[#FAFAFA]/80 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-[#374151]">Buscar productos</p>
        <StoreCatalogSearch slug={slug} primaryColor={tenant.primary_color} id="store-home-search" />
      </section>

      {featured.length > 0 ? (
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
          <ProductGrid slug={slug} tenant={tenant} products={featured} />
        </section>
      ) : null}

      {nuevos.length > 0 ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-bold text-[#111827]">Nuevo</h2>
            <Link
              href={`/tienda/${slug}/productos`}
              className="text-sm font-semibold hover:underline"
              style={{ color: tenant.primary_color }}
            >
              Ver catálogo →
            </Link>
          </div>
          <ProductGrid slug={slug} tenant={tenant} products={nuevos} />
        </section>
      ) : null}

      {hasAnyProducts ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-bold text-[#111827]">Tienda</h2>
            <Link
              href={`/tienda/${slug}/productos`}
              className="text-sm font-semibold hover:underline"
              style={{ color: tenant.primary_color }}
            >
              Ver todo →
            </Link>
          </div>
          <ProductGrid slug={slug} tenant={tenant} products={tienda} />
        </section>
      ) : (
        <p className="text-sm text-[#9CA3AF]">Aún no hay productos en esta tienda.</p>
      )}
    </div>
  );
}
