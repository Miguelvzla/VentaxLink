"use client";

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

export function AddToCartButton({ slug, product, primaryColor }: Props) {
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState<string | null>(null);
  const max = product.track_stock ? Math.max(1, product.stock) : 99;
  const disabled = product.track_stock && product.stock <= 0;

  function onClick() {
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
    setHint("Agregado al carrito");
    window.setTimeout(() => setHint(null), 2000);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-[#6B7280]">Cantidad</span>
        <div className="inline-flex items-center rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-8 w-8 text-sm text-[#374151] hover:bg-gray-50"
            aria-label="Restar cantidad"
            disabled={disabled}
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={max}
            value={qty}
            disabled={disabled}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (Number.isNaN(n)) return;
              setQty(Math.min(Math.max(1, n), max));
            }}
            className="h-8 w-14 border-x border-gray-200 text-center text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            className="h-8 w-8 text-sm text-[#374151] hover:bg-gray-50"
            aria-label="Sumar cantidad"
            disabled={disabled}
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: primaryColor }}
      >
        {disabled ? "Sin stock" : "Agregar al carrito"}
      </button>
      {hint ? <p className="mt-1 text-center text-xs text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}
