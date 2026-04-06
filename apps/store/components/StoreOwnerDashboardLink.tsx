"use client";

import { useEffect, useState } from "react";

/** Mismo nombre que en `apps/admin/lib/auth.ts` (cookie al iniciar sesión en el panel). */
const OWNER_TENANT_SLUG_COOKIE = "ventaxlink_tenant_slug";
const LS_TENANT_KEY = "ventaxlink_tenant";
const LS_TOKEN_KEY = "ventaxlink_access_token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

type Props = { slug: string; primaryColor: string };

/**
 * Si el visitante inició sesión en el panel como esta tienda, muestra enlace al dashboard.
 * En producción: requiere `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` en el **admin** (ej. `.ventaxlink.ar`)
 * para compartir la cookie entre admin y tienda.
 */
export function StoreOwnerDashboardLink({ slug, primaryColor }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fromCookie = readCookie(OWNER_TENANT_SLUG_COOKIE);
    if (fromCookie === slug) {
      setVisible(true);
      return;
    }
    try {
      const raw = localStorage.getItem(LS_TENANT_KEY);
      const token = localStorage.getItem(LS_TOKEN_KEY);
      if (!raw || !token) return;
      const t = JSON.parse(raw) as { slug?: string };
      if (t.slug === slug) setVisible(true);
    } catch {
      /* ignore */
    }
  }, [slug]);

  const adminBase = (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002").replace(/\/$/, "");
  const href = `${adminBase}/dashboard`;

  if (!visible) return null;

  return (
    <div className="border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/95 via-white to-emerald-50/95 px-4 py-2.5 text-center sm:px-6">
      <p className="text-xs text-[#6B7280]">
        Estás conectado como comerciante de esta tienda.{" "}
        <a
          href={href}
          className="inline-flex items-center gap-1 font-semibold underline decoration-2 underline-offset-2 hover:opacity-90"
          style={{ color: primaryColor }}
        >
          Ir al panel de administración
          <span aria-hidden>→</span>
        </a>
      </p>
    </div>
  );
}
