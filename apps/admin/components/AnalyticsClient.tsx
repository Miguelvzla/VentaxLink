"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AnalyticsSummary, getJson } from "@/lib/api";
import { getToken } from "@/lib/auth";

type SummaryResponse = { data: AnalyticsSummary };

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
          Resumen de tu comercio y eventos de la tienda pública. El rango de días depende de tu plan (Inicio 30 · Pro 90 ·
          Mayorista 365). El ranking de productos más vistos está disponible en plan Pro y Mayorista.
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
                Disponible en plan <strong>Pro</strong> y <strong>Mayorista</strong>. En plan Inicio no se registran
                vistas por producto para esta métrica.
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
        </>
      ) : null}
    </div>
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
