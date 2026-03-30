"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AnalyticsDashboardToday, getJson } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Res = { data: AnalyticsDashboardToday };

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

const cards: {
  key: keyof AnalyticsDashboardToday;
  label: string;
  sub: string;
  format: (v: AnalyticsDashboardToday) => string;
}[] = [
  {
    key: "salesToday",
    label: "Ventas hoy",
    sub: "Total facturado (día Argentina)",
    format: (d) => formatArs(d.salesToday),
  },
  {
    key: "ordersToday",
    label: "Pedidos hoy",
    sub: "Pedidos confirmados hoy",
    format: (d) => (d.ordersToday > 0 ? String(d.ordersToday) : "0"),
  },
  {
    key: "customersNewToday",
    label: "Clientes nuevos",
    sub: "Altas registradas hoy",
    format: (d) => String(d.customersNewToday),
  },
  {
    key: "avgTicketToday",
    label: "Ticket promedio",
    sub: "Promedio por pedido hoy",
    format: (d) => (d.avgTicketToday != null ? formatArs(d.avgTicketToday) : "—"),
  },
];

export function DashboardMetrics() {
  const token = getToken();
  const [data, setData] = useState<AnalyticsDashboardToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<Res>("/analytics/dashboard-today", token);
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las métricas");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm text-[#9CA3AF]">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#111827]">—</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">{c.sub}</p>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {error}{" "}
        <button type="button" onClick={() => load()} className="font-semibold underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="mt-3 h-8 w-20 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-full rounded bg-gray-50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#9CA3AF]">
        Cifras del día según hora{" "}
        <span className="font-medium text-[#6B7280]">Argentina (Buenos Aires)</span>.{" "}
        <Link href="/dashboard/analytics" className="font-medium text-[#2563EB] hover:underline">
          Ver analítica 30 días
        </Link>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm text-[#9CA3AF]">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#111827]">{c.format(data)}</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
