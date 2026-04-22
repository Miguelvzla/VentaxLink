import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCardCarousel } from "@/components/ProductCardCarousel";
import type { ProductListItem } from "@/lib/api";
import { badgeTextOnColor, readableOnWhite } from "@/lib/color-utils";

type Props = {
  product: ProductListItem;
  slug: string;
  primaryColor: string;
  pointsEarned?: number | null;
};

export function ProductCard({ product, slug, primaryColor, pointsEarned }: Props) {
  const price = formatArs(product.price);
  const old = product.compare_price ? formatArs(product.compare_price) : null;
  const productHref = `/tienda/${slug}/productos/${product.slug}`;
  const badgeTextColor = badgeTextOnColor(primaryColor);
  const priceColor = readableOnWhite(primaryColor);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image section */}
      <div className="relative aspect-square bg-[#F3F4F6]">
        <ProductCardCarousel images={product.images} name={product.name} />
        {product.is_new ? (
          <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
            Nuevo
          </span>
        ) : null}
        {product.is_featured ? (
          <span
            className="pointer-events-none absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: primaryColor, color: badgeTextColor }}
          >
            Destacado
          </span>
        ) : null}
      </div>

      {/* Text + price section */}
      <div className="p-3 sm:p-4">
        <h2 className="line-clamp-2 text-sm font-medium text-[#111827] sm:text-base">
          {product.name}
        </h2>
        {product.short_desc ? (
          <p className="mt-1 hidden line-clamp-1 text-xs text-[#9CA3AF] sm:block">
            {product.short_desc}
          </p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold sm:text-lg" style={{ color: priceColor }}>
            {price}
          </span>
          {old ? (
            <span className="text-xs text-[#9CA3AF] line-through sm:text-sm">{old}</span>
          ) : null}
        </div>
        {pointsEarned != null && pointsEarned > 0 ? (
          <p className="mt-1 text-xs font-medium text-emerald-700">~{pointsEarned} pts</p>
        ) : null}
      </div>

      {/* Full-card link sits above text but below the add-to-cart button */}
      <Link
        href={productHref}
        className="absolute inset-0 z-[5]"
        aria-label={`Ver ${product.name}`}
      />

      {/* Add-to-cart sits above the overlay link */}
      <div className="relative z-10 bg-white px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
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
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
