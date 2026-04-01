"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { url: string; alt: string | null };

export function ProductCardCarousel({ images, name }: { images: Img[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const current = images[idx];

  if (!current) {
    return <div className="flex h-full items-center justify-center text-4xl text-gray-300">📦</div>;
  }

  const many = images.length > 1;

  return (
    <>
      <Image src={current.url} alt={current.alt || name} fill className="object-cover" />
      {many ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i - 1 + images.length) % images.length);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1 text-white"
            aria-label="Imagen anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIdx((i) => (i + 1) % images.length);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1 text-white"
            aria-label="Imagen siguiente"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((im, i) => (
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
    </>
  );
}
