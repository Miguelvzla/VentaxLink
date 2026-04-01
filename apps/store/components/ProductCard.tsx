import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCardCarousel } from "@/components/ProductCardCarousel";
import type { ProductListItem } from "@/lib/api";

type Props = {
  product: ProductListItem;
  slug: string;
  primaryColor: string;
  /** Puntos que representa el precio del producto si el comercio tiene programa activo */
  pointsEarned?: number | null;
};

export function ProductCard({ product, slug, primaryColor, pointsEarned }: Props) {
  const price = formatArs(product.price);
  const old = product.compare_price ? formatArs(product.compare_price) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-[#F3F4F6]">
        <ProductCardCarousel images={product.images} name={product.name} />
        {product.is_new ? (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
            Nuevo
          </span>
        ) : null}
        {product.is_featured ? (
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Destacado
          </span>
        ) : null}
      </div>
      <Link href={`/tienda/${slug}/productos/${product.slug}`} className="block">
        <div className="p-4">
          <h2 className="font-medium text-[#111827] line-clamp-2">{product.name}</h2>
          {product.short_desc ? <p className="mt-1 line-clamp-2 text-xs text-[#9CA3AF]">{product.short_desc}</p> : null}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              {price}
            </span>
            {old ? <span className="text-sm text-[#9CA3AF] line-through">{old}</span> : null}
          </div>
          {pointsEarned != null && pointsEarned > 0 ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              ~{pointsEarned} pts si el pedido se entrega (programa del comercio)
            </p>
          ) : null}
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToCartButton
          slug={slug}
          primaryColor={primaryColor}
          product={{
            slug: product.slug,
            name: product.name,
            price: product.price,
            stock: product.stock,
            track_stock: product.track_stock,
          }}
        />
      </div>
    </article>
  );
}

function formatArs(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}
