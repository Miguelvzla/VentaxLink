"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StoreCartNav } from "@/components/StoreCartNav";
import { StoreShareButton } from "@/components/StoreShareButton";
import { StoreSocialIcons } from "@/components/StoreSocialIcons";
import { storePublicSiteOrigin } from "@/lib/api";
import type { PublicTenant } from "@/lib/api";

type Props = {
  tenant: PublicTenant;
  slug: string;
  waHref: string | null;
  primaryColor: string;
};

export function StoreHeaderActions({ tenant, slug, waHref, primaryColor }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // URL del collage para compartir como imagen (WhatsApp muestra banner grande)
  const ogVersion = tenant.og_preview_version ?? "0";
  const ogCollageUrl = `${storePublicSiteOrigin()}/og/store/${encodeURIComponent(slug)}?v=${encodeURIComponent(ogVersion)}`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkBase =
    "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2";
  const linkGhost = `${linkBase} text-[#374151] hover:bg-gray-100 hover:text-[#111827]`;
  const linkCta = `${linkBase} font-semibold text-white shadow-sm hover:brightness-110`;

  return (
    <div className="w-full min-w-0">
      {/* md+: barra en una sola fila, sin apilar encima del título */}
      <div className="hidden min-w-0 md:flex md:flex-col md:gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-6">
        <div className="min-w-0 max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:max-w-[min(100%,28rem)] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max flex-nowrap items-center gap-2 pb-0.5 lg:justify-end">
            <StoreSocialIcons tenant={tenant} waHref={waHref} variant="header" compact />
            <StoreShareButton slug={slug} storeName={tenant.name} ogCollageUrl={ogCollageUrl} compact />
          </div>
        </div>
        <nav
          className="flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
          aria-label="Navegación de la tienda"
        >
          <Link href={`/tienda/${slug}`} className={linkGhost}>
            Inicio
          </Link>
          <Link href={`/tienda/${slug}/productos`} className={linkCta} style={{ backgroundColor: primaryColor }}>
            Productos
          </Link>
          <StoreCartNav slug={slug} primaryColor={primaryColor} compact />
        </nav>
      </div>

      {/* móvil / tablet: menú compacto */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max flex-nowrap items-center gap-2 pb-0.5">
            <StoreSocialIcons tenant={tenant} waHref={waHref} variant="header" compact />
            <StoreShareButton slug={slug} storeName={tenant.name} ogCollageUrl={ogCollageUrl} compact />
          </div>
        </div>
        <button
          type="button"
          className="flex h-11 min-w-[3.25rem] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-[#374151] shadow-sm transition-colors hover:bg-gray-50"
          aria-expanded={open}
          aria-controls="store-header-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          {open ? (
            <span className="text-2xl font-light leading-none" aria-hidden>
              ×
            </span>
          ) : (
            <span className="flex h-3.5 w-5 flex-col justify-between py-0.5" aria-hidden>
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
              <span className="h-0.5 w-full rounded-full bg-current" />
            </span>
          )}
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            id="store-header-menu"
            className="absolute left-0 right-0 top-full z-50 mx-4 mt-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl md:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Navegación de la tienda">
              <Link
                href={`/tienda/${slug}`}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href={`/tienda/${slug}/productos`}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setOpen(false)}
              >
                Productos
              </Link>
              <StoreCartNav
                slug={slug}
                primaryColor={primaryColor}
                block
                onNavigate={() => setOpen(false)}
              />
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
