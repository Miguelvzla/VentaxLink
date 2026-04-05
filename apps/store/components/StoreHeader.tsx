import { StoreHeaderActions } from "@/components/StoreHeaderActions";
import type { PublicTenant } from "@/lib/api";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";

type Props = { tenant: PublicTenant; slug: string };

/** Solo la tienda de demostración; las tiendas reales no muestran el acceso a la landing. */
const DEMO_STORE_SLUG = "demo";

function landingHomeHref(): string {
  return (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function StoreHeader({ tenant, slug }: Props) {
  const wa = (tenant.whatsapp_number || tenant.phone || "").replace(/\D/g, "");
  const waLink = wa ? `https://wa.me/${wa.startsWith("54") ? wa : `54${wa}`}` : null;
  const banner = tenant.banner_url?.trim();
  const showDemoLandingLink = slug === DEMO_STORE_SLUG;

  return (
    <header className="relative z-20 overflow-visible border-b border-gray-100 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {showDemoLandingLink ? (
        <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 px-4 py-2.5 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">
              Tienda de demostración
            </span>
            <a
              href={landingHomeHref()}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-white px-3 py-1 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/80"
            >
              <span aria-hidden className="text-base leading-none">
                ←
              </span>
              Volver al inicio (VentaXLink)
            </a>
          </div>
        </div>
      ) : null}
      {banner ? (
        <div className="relative h-36 w-full overflow-hidden sm:h-44 md:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element -- URLs externas (API/uploads) */}
          <img
            src={resolvePublicMediaUrl(banner)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(0,0,0,0.25),transparent)]" />
        </div>
      ) : null}

      <div className="relative mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
            {tenant.logo_url?.trim() ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md ring-2 ring-white transition-shadow hover:shadow-lg sm:h-24 sm:w-24 md:h-28 md:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvePublicMediaUrl(tenant.logo_url.trim())}
                  alt={tenant.name}
                  className="h-full w-full object-contain p-1.5 sm:p-2"
                />
              </div>
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md ring-2 ring-white transition-transform hover:scale-[1.02] sm:h-24 sm:w-24 sm:text-3xl md:h-28 md:w-28 md:text-4xl"
                style={{
                  background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.secondary_color})`,
                }}
              >
                {tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold tracking-tight text-[#111827] sm:text-2xl md:text-3xl">
                {tenant.name}
              </h1>
              {tenant.description ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-[#6B7280] sm:text-base sm:leading-relaxed">
                  {tenant.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative w-full min-w-0 shrink-0 border-t border-gray-100 pt-4 lg:w-auto lg:max-w-[min(100%,24rem)] lg:border-t-0 lg:pt-0 xl:max-w-md">
            <StoreHeaderActions
              tenant={tenant}
              slug={slug}
              waHref={waLink}
              primaryColor={tenant.primary_color}
            />
          </div>
        </div>
      </div>

      {waLink ? (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-xl ring-4 ring-white/80 transition-all hover:scale-110 hover:shadow-2xl active:scale-95"
          style={{ backgroundColor: tenant.secondary_color }}
          aria-label="WhatsApp"
        >
          <span className="sr-only">WhatsApp</span>
          <span aria-hidden>💬</span>
        </a>
      ) : null}
    </header>
  );
}
