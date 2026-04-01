"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterRenderableProductImages } from "@/lib/product-images";

type Img = { url: string; alt: string | null };

type Props = {
  images: Img[];
  productName: string;
  /** Área principal de la foto = enlace al detalle (misma URL en la página de producto). */
  productHref?: string;
};

export function ProductImageCarousel({ images, productName, productHref }: Props) {
  const list = useMemo(() => filterRenderableProductImages(images), [images]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => Math.min(i, list.length - 1));
  }, [list.length]);

  const current = list[index];

  const passThrough = !!productHref;
  const controlBtn =
    "pointer-events-auto absolute z-[2] rounded-full bg-black/35 px-2.5 py-1.5 text-white";

  if (!current) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3F4F6]">
        {productHref ? (
          <Link href={productHref} className="absolute inset-0 z-0" aria-label={`Ver ${productName}`} />
        ) : null}
        <div className="pointer-events-none relative z-[1] flex h-full items-center justify-center text-6xl text-gray-300">
          📦
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3F4F6]">
        {productHref ? (
          <Link href={productHref} className="absolute inset-0 z-0" aria-label={`Ver ${productName}`} />
        ) : null}
        <div className={`relative z-[1] h-full w-full ${passThrough ? "pointer-events-none" : ""}`}>
          <Image
            src={current.url}
            alt={current.alt || productName}
            fill
            className={`object-cover ${passThrough ? "pointer-events-none" : ""}`}
          />
          {list.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + list.length) % list.length);
                }}
                className={`${controlBtn} left-2 top-1/2 -translate-y-1/2`}
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % list.length);
                }}
                className={`${controlBtn} right-2 top-1/2 -translate-y-1/2`}
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((im, i) => (
            <button
              key={`${im.url}-${i}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIndex(i);
              }}
              className={`pointer-events-auto relative z-[2] h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${
                i === index ? "border-[#2563EB]" : "border-transparent"
              }`}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image src={im.url} alt={im.alt || ""} fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
