"use client";

import { useState } from "react";

type Props = {
  slug: string;
  productSlug: string;
  productName: string;
};

function shareUrl(slug: string, productSlug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/tienda/${slug}/productos/${productSlug}`;
  }
  return `https://store.ventaxlink.ar/tienda/${slug}/productos/${productSlug}`;
}

export function ProductShareButton({ slug, productSlug, productName }: Props) {
  const [hint, setHint] = useState<string | null>(null);

  async function onShare() {
    const url = shareUrl(slug, productSlug);
    try {
      const nav = globalThis.navigator;
      if (typeof nav.share === "function") {
        await nav.share({
          title: productName,
          text: `Mirá este producto: ${productName}`,
          url,
        });
        return;
      }
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
      }
      setHint("Link copiado");
      window.setTimeout(() => setHint(null), 1800);
    } catch {
      // usuario canceló share o no hay permisos de clipboard
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void onShare()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#374151] shadow-sm transition hover:bg-gray-50"
        aria-label="Compartir producto"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden>
          <path d="M18 16a3 3 0 00-2.39 1.19L9.91 14.3a3.12 3.12 0 000-1.6l5.7-2.89A3 3 0 1014.5 8a3.12 3.12 0 00.05.54l-5.7 2.89a3 3 0 100 4.14l5.7 2.89A3 3 0 1018 16z" />
        </svg>
      </button>
      {hint ? (
        <span className="absolute -bottom-6 right-0 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] text-white">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
