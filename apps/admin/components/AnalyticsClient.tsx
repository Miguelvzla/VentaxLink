"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AnalyticsSummary, getJson, resolvePublicMediaUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";

const AnalyticsVisitsOrdersChart = dynamic(
  () =>
    import("./AnalyticsVisitsOrdersChart").then((m) => ({
      default: m.AnalyticsVisitsOrdersChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-xl bg-zinc-800/60" aria-hidden />
    ),
  },
);

type SummaryResponse = { data: AnalyticsSummary };

function formatArs(value: string | null | undefined) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AnalyticsClient() {
  const token = getToken();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<SummaryResponse>("/analytics/summary", token);
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) {
    return (
      <p className="text-sm text-[#6B7280]">
        Necesitás iniciar sesión.{" "}
        <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
          Ir al login
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Analítica</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Resumen de tu comercio y eventos de la tienda pública. El rango de días depende de tu plan (Inicio 30 · Pro
          90 · Mayorista 365). El panel avanzado con gráficos está en plan Pro y Mayorista.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[#6B7280]">Cargando…</p>
      ) : data ? (
        data.dashboardPro ? (
          <AnalyticsProLayout data={data} />
        ) : (
          <AnalyticsStarterLayout data={data} />
        )
      ) : null}
    </div>
  );
}

function AnalyticsProLayout({ data }: { data: AnalyticsSummary }) {
  const maxSold = Math.max(...data.topSoldProducts.map((s) => s.quantity_sold), 1);

  return (
    <div className="space-y-8 rounded-3xl border border-zinc-800 bg-[#0c0f14] p-5 text-zinc-100 shadow-xl sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">VentaXLink</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">Panel de analítica</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Últimos {data.rangeDays} días · visitas y pedidos por día calendario (Argentina)
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProKpi
          label="Productos"
          value={String(data.activeProductCount)}
          hint="Activos en catálogo"
        />
        <ProKpi
          label="Valoración de la tienda"
          value={formatArs(data.storeValuationArs)}
          hint="Σ stock × precio"
        />
        <ProKpi
          label="Visitas"
          value={String(data.visitCountInRange)}
          hint="Vistas a la tienda en el período"
        />
        <ProKpi label="Pedidos" value={String(data.orderCount)} hint="Total histórico" />
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-[#12161d] p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-white">Visitas vs pedidos</h3>
          <span className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-300">
            Últimos {data.rangeDays} días
          </span>
        </div>
        <AnalyticsVisitsOrdersChart data={data.dailyVisitsVsOrders} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/80 bg-[#12161d] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">Más vistos</h3>
          <p className="mt-1 text-sm text-zinc-500">Detalle de producto en la tienda pública</p>
          {!data.topProductViewsEnabled ? (
            <p className="mt-6 text-sm text-amber-400/90">No disponible en tu plan.</p>
          ) : data.topProductViews.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">Todavía no hay vistas registradas.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {data.topProductViews.map((r) => (
                <li
                  key={r.product_slug}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-700">
                    {r.image_url ? (
                      <Image
                        src={resolvePublicMediaUrl(r.image_url)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{r.name ?? r.product_slug}</p>
                    <p className="truncate font-mono text-xs text-zinc-500">{r.product_slug}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                    {r.views}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-[#12161d] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">Más vendidos</h3>
          <p className="mt-1 text-sm text-zinc-500">Unidades en pedidos del período (no cancelados)</p>
          {data.topSoldProducts.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">Todavía no hay ventas en este rango.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {data.topSoldProducts.map((r) => (
                <li key={r.product_id} className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-zinc-700">
                    {r.image_url ? (
                      <Image
                        src={resolvePublicMediaUrl(r.image_url)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{r.name}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-500/90 transition-all"
                        style={{
                          width: `${Math.max(8, (r.quantity_sold / maxSold) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-blue-400">
                    {r.quantity_sold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-[#12161d] p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-white">Eventos (últ. {data.rangeDays} días)</h3>
        <p className="mt-1 text-sm text-zinc-500">Conteo por tipo desde la tienda pública</p>
        {data.eventsInRange.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">Sin eventos registrados.</p>
        ) : (
          <ul className="mt-5 divide-y divide-zinc-800">
            {data.eventsInRange
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((e) => (
                <li key={e.event} className="flex items-center justify-between py-3 text-sm">
                  <code className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    {e.event}
                  </code>
                  <span className="font-semibold text-zinc-100">{e.count}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-zinc-600">
        VentaXLink · analítica para planes Pro y Mayorista
      </p>
    </div>
  );
}

function ProKpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-800/40 to-zinc-900/30 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function AnalyticsStarterLayout({ data }: { data: AnalyticsSummary }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Productos" value={data.productCount} />
        <StatCard label="Pedidos (total)" value={data.orderCount} />
        <StatCard label="Clientes" value={data.customerCount} />
        <StatCard label={`Pedidos (últ. ${data.rangeDays} días)`} value={data.ordersInRange} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-[#111827]">
          Productos más vistos (últ. {data.rangeDays} días)
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Basado en vistas del detalle de producto en la tienda pública.
        </p>
        {!data.topProductViewsEnabled ? (
          <p className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Disponible en plan <strong>Pro</strong> y <strong>Mayorista</strong>. En plan Inicio no se registran vistas
            por producto para esta métrica.
          </p>
        ) : data.topProductViews.length === 0 ? (
          <p className="mt-6 text-sm text-[#9CA3AF]">
            Todavía no hay datos. Visitá un producto en la tienda para registrar eventos.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100">
            {data.topProductViews.map((r) => (
              <li key={r.product_slug} className="flex items-center justify-between py-3 text-sm">
                <code className="rounded bg-gray-50 px-2 py-0.5 font-mono text-xs">{r.product_slug}</code>
                <span className="font-semibold text-[#111827]">{r.views} vistas</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-[#111827]">
          Eventos (últ. {data.rangeDays} días)
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Conteo por tipo de evento enviado desde la tienda (por ejemplo visitas).
        </p>
        {data.eventsInRange.length === 0 ? (
          <p className="mt-6 text-sm text-[#9CA3AF]">Todavía no hay eventos registrados.</p>
        ) : (
          <ul className="mt-6 divide-y divide-gray-100">
            {data.eventsInRange
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((e) => (
                <li key={e.event} className="flex items-center justify-between py-3 text-sm">
                  <code className="rounded bg-gray-50 px-2 py-0.5 font-mono text-xs text-[#374151]">
                    {e.event}
                  </code>
                  <span className="font-semibold text-[#111827]">{e.count}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 text-sm text-emerald-950">
        <strong>¿Querés gráficos y ranking de más vendidos?</strong> Pasate a plan Pro o Mayorista para ver visitas vs
        pedidos, valoración de inventario y más.
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-[#111827]">{value}</p>
    </div>
  );
}
