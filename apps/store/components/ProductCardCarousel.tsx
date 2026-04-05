"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { filterRenderableProductImages } from "@/lib/product-images";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";

type Img = { url: string; alt: string | null };

export function ProductCardCarousel({ images, name }: { images: Img[]; name: string }) {
  const list = useMemo(() => filterRenderableProductImages(images), [images]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length === 0) {
      setIdx(0);
      return;
    }
    setIdx((i) => Math.min(i, list.length - 1));
  }, [list.length]);

  const current = list[idx];

  if (!current) {
    return (
      <div className="pointer-events-none flex h-full items-center justify-center text-4xl text-gray-300">
        📦
      </div>
    );
  }

  const many = list.length > 1;
  const controlBtn =
    "pointer-events-auto absolute z-[2] rounded-full bg-black/35 px-2 py-1 text-white";

  return (
    <div className="relative h-full w-full pointer-events-none">
      <Image
        src={resolvePublicMediaUrl(current.url)}
        alt={current.alt || name}
        fill
        className="object-cover pointer-events-none"
      />
      {many ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i - 1 + list.length) % list.length);
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
              setIdx((i) => (i + 1) % list.length);
            }}
            className={`${controlBtn} right-2 top-1/2 -translate-y-1/2`}
            aria-label="Imagen siguiente"
          >
            ›
          </button>
          <div className="pointer-events-auto absolute bottom-2 left-1/2 z-[2] flex -translate-x-1/2 gap-1">
            {list.map((im, i) => (
              <button
                key={`${im.url}-${i}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIdx(i);
                }}
                className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/55"}`}
                aria-label={`Ver imagen ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
