"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { url: string; alt: string | null };

export function ProductImageCarousel({ images, productName }: { images: Img[]; productName: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3F4F6]">
        <Image src={current.url} alt={current.alt || productName} fill className="object-cover" />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2.5 py-1.5 text-white"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2.5 py-1.5 text-white"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button
              key={`${im.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${
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
