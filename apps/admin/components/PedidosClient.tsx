"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AdminOrder, getJson, patchJson } from "@/lib/api";
import { downloadXlsx } from "@/lib/exportExcel";
import { getToken } from "@/lib/auth";
import { whatsappMeUrlFromPhone } from "@/lib/whatsapp";

const STATUS_OPTS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY: "Listo para retirar/envío",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

type ListResponse = { data: AdminOrder[] };

function formatArs(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PedidosClient() {
  const token = getToken();
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<ListResponse>("/orders", token);
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onStatusChange(orderId: string, status: string) {
    if (!token) return;
    setUpdating(orderId);
    setError(null);
    try {
      await patchJson(`/orders/${orderId}/status`, token, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el estado");
    } finally {
      setUpdating(null);
    }
  }

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
          <h1 className="text-xl font-bold text-[#111827]">Pedidos</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Pedidos de la tienda (checkout público). Cambiá el estado para organizar la preparación y la entrega.
          </p>
        </div>
        {!loading && items.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const rows = items.map((o) => ({
                Pedido: o.order_number,
                Fecha: formatDate(o.created_at),
                Cliente: o.customer_name,
                Teléfono: o.customer_phone,
                Email: o.customer_email ?? "",
                Estado: STATUS_LABEL[o.status] ?? o.status,
                Pago: o.payment_status,
                Total_ARS: o.total,
                Subtotal_ARS: o.subtotal,
                Envío_ARS: o.shipping_cost,
                Descuento_ARS: o.discount_amount,
                Entrega: o.delivery_type,
                Productos: o.items.map((i) => `${i.product_name} x${i.quantity}`).join("; "),
              }));
              downloadXlsx(
                `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
                "Pedidos",
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
          <p className="p-8 text-center text-sm text-[#6B7280]">Todavía no hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-[#FAFAFA] text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#374151]">
                {items.map((o) => {
                  const waLink = whatsappMeUrlFromPhone(o.customer_phone);
                  return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[#111827]">#{o.order_number}</p>
                      <p className="text-xs text-[#9CA3AF]">{formatDate(o.created_at)}</p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{o.delivery_type}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium">{o.customer_name}</p>
                      <p className="text-xs text-[#6B7280]">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[#059669] hover:underline"
                          >
                            {o.customer_phone}
                          </a>
                        ) : (
                          o.customer_phone
                        )}
                      </p>
                      {o.customer_notes ? (
                        <p className="mt-1 text-xs italic text-[#9CA3AF]">{o.customer_notes}</p>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 align-top">
                      <ul className="space-y-0.5 text-xs">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            {i.product_name}{" "}
                            <span className="text-[#9CA3AF]">×{i.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-medium">
                      {formatArs(o.total)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={o.status}
                        disabled={updating === o.id}
                        onChange={(e) => onStatusChange(o.id, e.target.value)}
                        className="w-full max-w-[200px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none ring-[#2563EB] focus:ring-2 disabled:opacity-60"
                      >
                        {STATUS_OPTS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s] ?? s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
