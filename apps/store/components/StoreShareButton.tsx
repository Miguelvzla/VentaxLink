"use client";

import { useState } from "react";

type Props = {
  slug: string;
  storeName: string;
  /** URL del collage OG para compartir como imagen en WhatsApp */
  ogCollageUrl?: string;
  /** Misma escala que StoreSocialIcons compact en header */
  compact?: boolean;
};

type State = "idle" | "loading" | "copied";

function storeShareUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/tienda/${slug}`;
  }
  return `https://store.ventaxlink.ar/tienda/${slug}`;
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 16a3 3 0 00-2.39 1.19L9.91 14.3a3.12 3.12 0 000-1.6l5.7-2.89A3 3 0 1014.5 8a3.12 3.12 0 00.05.54l-5.7 2.89a3 3 0 100 4.14l5.7 2.89A3 3 0 1018 16z" />
    </svg>
  );
}

function SpinnerGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function StoreShareButton({
  slug,
  storeName,
  ogCollageUrl,
  compact = false,
}: Props) {
  const [state, setState] = useState<State>("idle");

  const btn = compact
    ? "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-white/95 text-[#374151] shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
    : "flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-[#374151] shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed";

  const glyph = compact ? "h-4 w-4" : "h-5 w-5";

  async function onShare() {
    if (state === "loading") return;
    const url = storeShareUrl(slug);
    const nav = globalThis.navigator;
    const shareText = `${storeName}\n${url}`;

    // ── Intento 1: compartir imagen como foto (WhatsApp muestra banner grande) ──
    if (ogCollageUrl && typeof nav?.canShare === "function") {
      try {
        setState("loading");
        const res = await fetch(ogCollageUrl, { cache: "force-cache" });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `${slug}.png`, {
            type: blob.type || "image/png",
          });
          if (nav.canShare({ files: [file] })) {
            setState("idle");
            await nav.share({ files: [file], text: shareText, title: storeName });
            return;
          }
        }
      } catch {
        // fall through al share normal
      } finally {
        setState("idle");
      }
    }

    // ── Intento 2: share nativo solo URL ──
    try {
      if (typeof nav?.share === "function") {
        await nav.share({
          title: storeName,
          text: `Mirá esta tienda: ${storeName}`,
          url,
        });
        return;
      }
      // ── Fallback: copiar al portapapeles ──
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
      }
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      /* cancelado o sin permisos */
    }
  }

  const hint =
    state === "loading"
      ? "Preparando..."
      : state === "copied"
        ? "Link copiado"
        : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => void onShare()}
        disabled={state === "loading"}
        className={`${btn} hover:text-[#2563EB]`}
        aria-label="Compartir tienda"
      >
        {state === "loading" ? (
          <SpinnerGlyph className={glyph} />
        ) : (
          <ShareGlyph className={glyph} />
        )}
      </button>
      {hint ? (
        <span className="absolute -bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/75 px-2 py-0.5 text-[10px] text-white">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
