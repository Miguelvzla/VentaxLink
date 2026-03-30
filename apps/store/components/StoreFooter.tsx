import Image from "next/image";
import Link from "next/link";
import { StoreSocialIcons } from "@/components/StoreSocialIcons";
import type { PublicTenant } from "@/lib/api";

type Props = { tenant: PublicTenant };

const landingUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export function StoreFooter({ tenant }: Props) {
  const hasSocial =
    !!(tenant.instagram_url?.trim() || tenant.facebook_url?.trim() || tenant.tiktok_url?.trim());
  const wa = (tenant.whatsapp_number || tenant.phone || "").replace(/\D/g, "");
  const waLink = wa ? `https://wa.me/${wa.startsWith("54") ? wa : `54${wa}`}` : null;
  const hasLocation = !!(tenant.address?.trim() || tenant.google_maps_url?.trim());
  const showSocialRow = hasSocial || !!waLink;

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-gray-200/80 bg-gradient-to-b from-[#FAFAFA] to-[#F3F4F6]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#22C55E]/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#2563EB]/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {hasLocation ? (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Ubicación</h2>
            {tenant.address?.trim() ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#374151]">{tenant.address.trim()}</p>
            ) : null}
            {tenant.google_maps_url?.trim() ? (
              <a
                href={tenant.google_maps_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-lg text-sm font-semibold transition-all hover:gap-2 hover:underline"
                style={{ color: tenant.primary_color }}
              >
                Ver en el mapa →
              </a>
            ) : null}
          </section>
        ) : null}

        {showSocialRow ? (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Seguinos</h2>
            <div className="mt-4">
              <StoreSocialIcons tenant={tenant} waHref={waLink} variant="footer" />
            </div>
          </section>
        ) : null}

        <div className="relative mt-8 flex flex-col items-center justify-between gap-6 border-t border-gray-200/90 pt-10 sm:flex-row">
          <p className="order-2 text-center text-xs text-[#9CA3AF] sm:order-1 sm:text-left">
            © {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.
          </p>

          <Link
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="order-1 group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/90 bg-white/80 px-6 py-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#22C55E]/40 hover:shadow-xl sm:order-2 sm:flex-row sm:gap-4"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF] transition-colors group-hover:text-[#6B7280]">
              Tienda con
            </span>
            <Image
              src="/ventaxlink-logo.png"
              alt="VentaXLink"
              width={200}
              height={48}
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 sm:h-11"
            />
            <span className="max-w-[200px] text-center text-[11px] leading-snug text-[#9CA3AF] sm:max-w-[140px] sm:text-left">
              Tu catálogo y pedidos en un solo link
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
