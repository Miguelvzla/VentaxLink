import Link from "next/link";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { DashboardPlanInfo } from "@/components/DashboardPlanInfo";
import { DashboardStoreBanner } from "@/components/DashboardStoreBanner";

export const dynamic = "force-dynamic";

function apiHealthUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1").replace(/\/+$/, "");
  return `${base}/health`;
}

async function checkBackend(): Promise<{ ok: boolean; detail: string }> {
  const url = apiHealthUrl();
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, detail: `La API respondió HTTP ${res.status}.` };
    }
    const data = (await res.json()) as { status?: string; database?: boolean };
    if (data.status !== "ok") {
      return { ok: false, detail: "Respuesta inesperada de la API." };
    }
    if (!data.database) {
      return {
        ok: false,
        detail: "La API está arriba pero no puede conectar a PostgreSQL.",
      };
    }
    return { ok: true, detail: "API y base de datos respondieron correctamente." };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "No se pudo contactar a la API.",
    };
  }
}

export default async function DashboardHomePage() {
  const dbStatus = await checkBackend();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Resumen y accesos rápidos.</p>
      </div>

      <DashboardStoreBanner />

      <DashboardPlanInfo />

      <div
        className={`rounded-2xl border p-6 shadow-sm ${
          dbStatus.ok ? "border-green-200 bg-white" : "border-amber-200 bg-amber-50"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">API y base de datos</h2>
        <p className={`mt-2 text-lg font-medium ${dbStatus.ok ? "text-green-700" : "text-amber-800"}`}>
          {dbStatus.ok ? "Todo bien" : "Revisar conexión"}
        </p>
        <p className="mt-1 text-sm text-[#6B7280]">{dbStatus.detail}</p>
        {!dbStatus.ok && (
          <p className="mt-4 text-sm text-[#92400E]">
            Comprobá que la API esté en marcha y que{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code> apunte a{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">…/v1</code>. En local: levantá Postgres con{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">docker compose -f infra/docker-compose.yml up -d</code>
            , configurá <code className="rounded bg-white/80 px-1 py-0.5 text-xs">DATABASE_URL</code> en la API y{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">npm run db:migrate</code> en la raíz del monorepo.
          </p>
        )}
      </div>

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
