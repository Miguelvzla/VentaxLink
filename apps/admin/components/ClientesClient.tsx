"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AdminCustomer, getJson } from "@/lib/api";
import { downloadXlsx } from "@/lib/exportExcel";
import { getToken } from "@/lib/auth";

type ListResponse = { data: AdminCustomer[] };

function formatArs(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClientesClient() {
  const token = getToken();
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<ListResponse>("/customers", token);
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los clientes");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Clientes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Compradores que ya hicieron un pedido en tu tienda (se crean o actualizan al confirmar el checkout).
          </p>
        </div>
        {!loading && items.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const rows = items.map((c) => ({
                Nombre: c.name,
                Teléfono: c.phone,
                Email: c.email ?? "",
                Puntos: c.points,
                Pedidos: c.total_orders,
                Total_gastado_ARS: c.total_spent,
                Alta: formatDateShort(c.created_at),
                Último_pedido: formatDateShort(c.last_order_at),
                Activo: c.is_active ? "Sí" : "No",
              }));
              downloadXlsx(
                `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`,
                "Clientes",
                rows,
              );
            }}
            className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50"
          >
            Exportar Excel
          </button>
        ) : null}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-[#6B7280]">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6B7280]">
            Todavía no hay clientes registrados por pedidos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Puntos</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Total gastado</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3">Último pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#374151]">
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-[#111827]">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-3 text-xs">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{c.points}</td>
                    <td className="px-4 py-3">{c.total_orders}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatArs(c.total_spent)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280]">{formatDate(c.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
