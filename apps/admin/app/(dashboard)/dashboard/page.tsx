import Link from "next/link";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { DashboardPlanInfo } from "@/components/DashboardPlanInfo";
import { DashboardStoreBanner } from "@/components/DashboardStoreBanner";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Resumen y accesos rápidos.</p>
      </div>

      <DashboardStoreBanner />

      <DashboardPlanInfo />

      <DashboardMetrics />

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#111827]">Acciones rápidas</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/productos"
            className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
          >
            Nuevo producto
          </Link>
          <Link
            href="/dashboard/pedidos"
            className="rounded-xl border-2 border-[#2563EB] px-5 py-2.5 text-sm font-semibold text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
          >
            Ver pedidos
          </Link>
          <span className="rounded-xl border border-dashed border-gray-200 px-5 py-2.5 text-sm text-[#9CA3AF]">
            Abrí tu tienda desde el recuadro verde de arriba (app Store, puerto 3003).
          </span>
        </div>
      </div>
    </div>
  );
}
