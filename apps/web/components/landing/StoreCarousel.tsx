"use client";

import { useRef, useEffect } from "react";

export type RecentStore = {
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
};

const storeOrigin = (process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003").replace(/\/+$/, "");

function StoreAvatar({ store }: { store: RecentStore }) {
  return (
    <a
      href={`${storeOrigin}/tienda/${store.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2.5 text-center"
      aria-label={`Ver tienda de ${store.name}`}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md ring-2 ring-white transition-all group-hover:scale-110 group-hover:shadow-lg sm:h-20 sm:w-20"
        style={{
          background: store.logo_url
            ? undefined
            : `linear-gradient(135deg, ${store.primary_color}, ${store.secondary_color})`,
        }}
      >
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logo_url}
            alt={store.name}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span className="text-2xl font-bold text-white sm:text-3xl">
            {store.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <span className="max-w-[80px] text-xs font-medium leading-tight text-[#374151] group-hover:text-[#2563EB] sm:max-w-[96px] sm:text-sm">
        {store.name}
      </span>
    </a>
  );
}

export function StoreCarousel({ stores }: { stores: RecentStore[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);

  // Auto-scroll suave e infinito
  useEffect(() => {
    if (!stores.length) return;
    const track = trackRef.current;
    if (!track) return;

    const speed = 0.5; // px por frame
    let paused = false;

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    track.addEventListener("mouseenter", onEnter);
    track.addEventListener("mouseleave", onLeave);

    const step = () => {
      if (!paused && track) {
        posRef.current += speed;
        const half = track.scrollWidth / 2;
        if (posRef.current >= half) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animRef.current);
      track.removeEventListener("mouseenter", onEnter);
      track.removeEventListener("mouseleave", onLeave);
    };
  }, [stores]);

  if (!stores.length) return null;

  // Duplicar para efecto infinito
  const doubled = [...stores, ...stores];

  return (
    <section className="border-b border-gray-100 bg-gradient-to-b from-white to-[#F9FAFB] py-10 sm:py-12 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Tiendas que ya usan VentaXLink
        </p>
      </div>
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-8 sm:gap-10"
          style={{ width: "max-content", willChange: "transform" }}
        >
          {doubled.map((s, i) => (
            <StoreAvatar key={`${s.slug}-${i}`} store={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
