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
  const [hint, setHint] = useState<string | null>(null);
  const disabled = product.track_stock && product.stock <= 0;

  function onClick() {
    setHint(null);
    const r = addToCart(slug, {
      product_slug: product.slug,
      name: product.name,
      price: product.price,
      stock: product.stock,
      track_stock: product.track_stock,
      quantity: 1,
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
