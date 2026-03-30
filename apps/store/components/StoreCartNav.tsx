"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartItemCount } from "@/lib/cart";

type Props = {
  slug: string;
  primaryColor: string;
  /** Enlaces más compactos en la barra desktop */
  compact?: boolean;
  /** Ancho completo (menú móvil) */
  block?: boolean;
  onNavigate?: () => void;
};

export function StoreCartNav({ slug, primaryColor, compact, block, onNavigate }: Props) {
  const [count, setCount] = useState(0);

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

  const pad = block ? "px-4 py-2.5 text-sm" : compact ? "px-2.5 py-1.5 text-xs" : "px-5 py-3 text-sm";
  const layout = block ? "flex w-full items-center justify-between rounded-xl" : "relative inline-flex items-center gap-2 rounded-xl";

  return (
    <Link
      href={`/tienda/${slug}/carrito`}
      className={`${layout} ${pad} font-medium text-[#374151] transition-colors hover:bg-gray-100`}
      onClick={onNavigate}
    >
      Carrito
      {count > 0 ? (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
