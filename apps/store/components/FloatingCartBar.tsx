"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartItemCount } from "@/lib/cart";
import { buttonTextOnColor } from "@/lib/color-utils";

type Props = {
  slug: string;
  primaryColor: string;
};

export function FloatingCartBar({ slug, primaryColor }: Props) {
  const [count, setCount] = useState(0);
  const textColor = buttonTextOnColor(primaryColor);

  useEffect(() => {
    const sync = () => setCount(cartItemCount(slug));
    sync();
    window.addEventListener("ventaxlink-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ventaxlink-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  if (count <= 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
      <Link
        href={`/tienda/${slug}/carrito`}
        className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl"
        style={{ backgroundColor: primaryColor, color: textColor }}
      >
        <span>Ver carrito</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{
            backgroundColor: textColor === "#ffffff" ? "rgba(255, 255, 255, 0.25)" : "rgba(17, 24, 39, 0.12)",
          }}
        >
          {count}
        </span>
      </Link>
    </div>
  );
}
