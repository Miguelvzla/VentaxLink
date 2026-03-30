"use client";

import { getStoredTenant } from "@/lib/auth";

const storeOrigin = process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003";

function planLabel(plan: string): string {
  switch (plan) {
    case "STARTER":
      return "Inicio (gratis)";
    case "PRO":
      return "Pro (pago)";
    case "WHOLESALE":
      return "Mayorista (pago plus)";
    default:
      return plan;
  }
}

export function DashboardStoreBanner() {
  const tenant = getStoredTenant();
  if (!tenant?.slug) return null;
  const url = `${storeOrigin}/tienda/${tenant.slug}`;

  return (
    <div className="rounded-2xl border border-green-100 bg-gradient-to-r from-[#F0FDF4] to-white p-5 shadow-sm">
      <p className="text-xs text-[#6B7280]">
        Plan actual: <span className="font-semibold text-[#374151]">{planLabel(tenant.plan)}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-[#166534]">Tu tienda pública</p>
      <p className="mt-1 text-sm text-[#6B7280]">
        Compartí este link con tus clientes para que vean el catálogo y compren.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex break-all text-sm font-semibold text-[#2563EB] hover:underline"
      >
        {url} →
      </a>
    </div>
  );
}
