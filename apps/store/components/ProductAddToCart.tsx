"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "@/lib/cart";

type ProductRef = {
  slug: string;
  name: string;
  price: string;
  stock: number;
  track_stock: boolean;
};

type Props = {
  slug: string;
  product: ProductRef;
  primaryColor: string;
};

export function ProductAddToCart({ slug, product, primaryColor }: Props) {
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const max = product.track_stock ? Math.max(0, product.stock) : 999;
  const disabled = product.track_stock && product.stock <= 0;

  function onAdd() {
    setHint(null);
    const r = addToCart(slug, {
      product_slug: product.slug,
      name: product.name,
      price: product.price,
      stock: product.stock,
      track_stock: product.track_stock,
      quantity: qty,
    });
    if (!r.ok) {
      setHint(r.message ?? "No se pudo agregar");
      return;
    }
    setHint("Listo — revisá el carrito para confirmar el pedido.");
  }

  return (
    <div className="mt-8 border-t border-gray-100 pt-8">
      <h2 className="font-semibold text-[#111827]">Comprar</h2>
      {disabled ? (
        <p className="mt-3 text-sm text-red-600">Este producto no tiene stock por ahora.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-[#374151]">
              Cantidad
              <input
                type="number"
                min={1}
                max={max || 1}
                value={qty}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(n)) return;
                  const c = Math.min(Math.max(1, n), max || 1);
                  setQty(c);
                }}
                className="ml-2 w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Agregar al carrito
            </button>
            <LinkToCart slug={slug} primaryColor={primaryColor} />
          </div>
          {hint ? <p className="mt-3 text-sm text-[#6B7280]">{hint}</p> : null}
        </>
      )}
    </div>
  );
}

function LinkToCart({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  return (
    <Link
      href={`/tienda/${slug}/carrito`}
      className="text-sm font-semibold hover:underline"
      style={{ color: primaryColor }}
    >
      Ir al carrito →
    </Link>
  );
}
