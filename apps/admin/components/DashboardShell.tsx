"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  TicketPercent,
  Gift,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getStoredTenant } from "@/lib/auth";
import { LogoutLink } from "@/components/LogoutLink";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si está definido, solo se muestra con uno de estos planes */
  plans?: readonly string[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/productos", label: "Productos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/analytics", label: "Analítica", icon: BarChart3 },
  {
    href: "/dashboard/cupones",
    label: "Cupones",
    icon: TicketPercent,
    plans: ["PRO", "WHOLESALE"],
  },
  {
    href: "/dashboard/puntos",
    label: "Puntos",
    icon: Gift,
    plans: ["PRO", "WHOLESALE"],
  },
  {
    href: "/dashboard/soporte",
    label: "Soporte comercial",
    icon: LifeBuoy,
    plans: ["PRO", "WHOLESALE"],
  },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

function planLabel(plan: string): string {
  switch (plan) {
    case "STARTER":
      return "Inicio";
    case "PRO":
      return "Pro";
    case "WHOLESALE":
      return "Mayorista";
    default:
      return plan;
  }
}

const webOrigin = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const planesPublicHref = `${webOrigin.replace(/\/$/, "")}/#planes`;
const upgradePanelHref = "/dashboard/plan";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setPlan(getStoredTenant()?.plan ?? "STARTER");
    sync();
    window.addEventListener("ventaxlink-plan", sync);
    return () => window.removeEventListener("ventaxlink-plan", sync);
  }, []);

  const effectivePlan = plan ?? "STARTER";

  const visibleNav = useMemo(
    () =>
      navItems.filter((item) => {
        if (!item.plans?.length) return true;
        return item.plans.includes(effectivePlan);
      }),
    [effectivePlan],
  );

  const planName = planLabel(effectivePlan);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col bg-[#1E40AF] text-white md:flex">
        <div className="border-b border-white/10 px-4 py-5">
          <span className="font-semibold">
            <span className="text-[#86EFAC]">Venta</span>
            <span className="text-white">XLink</span>
          </span>
          <p className="text-xs text-blue-200">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-3 rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">Plan activo</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{planName}</p>
            <Link
              href={upgradePanelHref}
              className="mt-2 inline-block text-xs font-medium text-[#86EFAC] underline decoration-[#86EFAC]/50 underline-offset-2 hover:text-white hover:decoration-white"
            >
              Cambiar o subir plan
            </Link>
            <a
              href={planesPublicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-[10px] text-blue-200/90 underline hover:text-white"
            >
              Ver precios en la web
            </a>
          </div>
          <LogoutLink className="text-xs text-blue-200 hover:text-white">Cerrar sesión</LogoutLink>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1E40AF]">VentaXLink</span>
            <LogoutLink className="text-sm text-[#2563EB]">Salir</LogoutLink>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-[#374151]">
            <span>
              Plan: <strong className="text-[#111827]">{planName}</strong>
            </span>
            <Link href={upgradePanelHref} className="font-semibold text-[#2563EB] underline">
              Subir plan
            </Link>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Menú móvil del panel">
            {visibleNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  pathname === href
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                    : "border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
