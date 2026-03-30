import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductAddToCart } from "@/components/ProductAddToCart";
import { ProductViewTracker } from "@/components/ProductViewTracker";
import { estimateProductPoints, fetchProduct, fetchTenant } from "@/lib/api";

function formatArs(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ slug: string; pSlug: string }>;
}) {
  const { slug, pSlug } = await params;
  const [tenant, productRes] = await Promise.all([fetchTenant(slug), fetchProduct(slug, pSlug)]);

  if (!tenant || !productRes) notFound();

  const { data: p } = productRes;
  const base = Number(p.price);
  const images = p.images.length ? p.images : [];
  const pts = estimateProductPoints(tenant, p.price);
  const trackProductViews = tenant.plan === "PRO" || tenant.plan === "WHOLESALE";

  return (
    <div>
      <ProductViewTracker slug={slug} productSlug={p.slug} enabled={trackProductViews} />
      <Link
        href={`/tienda/${slug}/productos`}
        className="text-sm font-medium text-[#6B7280] hover:text-[#111827]"
      >
        ← Volver al catálogo
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3F4F6]">
            {images[0] ? (
              <Image src={images[0].url} alt={images[0].alt || p.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-gray-300">📦</div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(1).map((im) => (
                <div key={im.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image src={im.url} alt={im.alt || ""} fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          {p.is_new ? (
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Nuevo
            </span>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-bold text-[#111827]">{p.name}</h1>
          {p.short_desc ? <p className="mt-2 text-[#6B7280]">{p.short_desc}</p> : null}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold" style={{ color: tenant.primary_color }}>
              {formatArs(p.price)}
            </span>
            {p.compare_price ? (
              <span className="text-lg text-[#9CA3AF] line-through">{formatArs(p.compare_price)}</span>
            ) : null}
          </div>
          {pts != null ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              ~{pts} puntos si tu pedido se entrega (según el programa del comercio)
            </p>
          ) : null}

          {p.track_stock ? (
            <p className="mt-4 text-sm text-[#6B7280]">
              {p.stock > 0 ? (
                <span className="text-emerald-600">Stock disponible: {p.stock}</span>
              ) : (
                <span className="text-red-600">Sin stock por ahora</span>
              )}
            </p>
          ) : null}

          {p.description ? (
            <div className="mt-8 border-t border-gray-100 pt-8">
              <h2 className="font-semibold text-[#111827]">Descripción</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#4B5563]">{p.description}</p>
            </div>
          ) : null}

          {p.variants.length > 0 ? (
            <div className="mt-8">
              <h2 className="font-semibold text-[#111827]">Variantes</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {p.variants.map((v) => {
                  const mod = Number(v.price_modifier);
                  const price = base + mod;
                  return (
                    <li key={v.id} className="flex justify-between rounded-xl bg-[#F9FAFB] px-4 py-3">
                      <span>
                        {v.name}: {v.value}
                      </span>
                      <span className="font-medium">{formatArs(String(price))}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <ProductAddToCart
            slug={slug}
            primaryColor={tenant.primary_color}
            product={{
              slug: p.slug,
              name: p.name,
              price: p.price,
              stock: p.stock,
              track_stock: p.track_stock,
            }}
          />
        </div>
      </div>
    </div>
  );
}
