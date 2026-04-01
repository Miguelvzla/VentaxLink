import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreFooter } from "@/components/StoreFooter";
import { FloatingCartBar } from "@/components/FloatingCartBar";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreVisitTracker } from "@/components/StoreVisitTracker";
import { fetchTenant } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await fetchTenant(slug);
  if (!tenant) {
    return { title: "Tienda no encontrada" };
  }

  const logo = tenant.logo_url?.trim();
  const fallbackIcon = "/ventaxlink-logo.png";
  const base =
    (process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3003").replace(/\/$/, "") ||
    "http://localhost:3003";
  const canonical = `${base}/tienda/${slug}`;
  const desc = tenant.description?.trim() || `Comprá en ${tenant.name}`;
  const ogImage = logo || `${base}${fallbackIcon}`;

  return {
    metadataBase: new URL(base),
    title: `${tenant.name} · VentaXLink`,
    description: desc,
    openGraph: {
      title: `${tenant.name} · VentaXLink`,
      description: desc,
      url: canonical,
      siteName: "VentaXLink",
      locale: "es_AR",
      type: "website",
      images: [{ url: ogImage, alt: tenant.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${tenant.name} · VentaXLink`,
      description: desc,
      images: [ogImage],
    },
    icons: logo
      ? {
          icon: [{ url: logo }],
          apple: [{ url: logo, sizes: "180x180" }],
          shortcut: logo,
        }
      : {
          icon: [{ url: fallbackIcon, type: "image/png" }],
          apple: [{ url: fallbackIcon, sizes: "180x180", type: "image/png" }],
        },
  };
}

export default async function TiendaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await fetchTenant(slug);
  if (!tenant) notFound();

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          "--tenant-primary": tenant.primary_color,
          "--tenant-secondary": tenant.secondary_color,
        } as React.CSSProperties
      }
    >
      <StoreVisitTracker slug={slug} />
      <StoreHeader tenant={tenant} slug={slug} />
      {tenant.catalog_limited && tenant.billing_hold_message ? (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Catálogo limitado</p>
            <p className="mt-1 text-amber-900/95">{tenant.billing_hold_message}</p>
            {tenant.catalog_total_products != null && tenant.catalog_visible_cap != null ? (
              <p className="mt-2 text-xs text-amber-800/90">
                Mostrando hasta {tenant.catalog_visible_cap} de {tenant.catalog_total_products} productos activos.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      <FloatingCartBar slug={slug} primaryColor={tenant.primary_color} />
      <StoreFooter tenant={tenant} />
    </div>
  );
}
