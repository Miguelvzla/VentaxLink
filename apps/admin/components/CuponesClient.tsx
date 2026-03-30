"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type AdminCoupon,
  deleteJson,
  getJson,
  patchJson,
  postJson,
  type TenantMe,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

type ListRes = { data: AdminCoupon[] };
type MeRes = { data: TenantMe };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function CuponesClient() {
  const router = useRouter();
  const token = getToken();
  const [plan, setPlan] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const me = await getJson<MeRes>("/tenant/me", token);
      setPlan(me.data.plan);
      if (me.data.plan === "STARTER") {
        setRows([]);
        setLoading(false);
        router.replace("/dashboard");
        return;
      }
      const res = await getJson<ListRes>("/coupons", token);
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los cupones");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const c = code.trim();
    const p = Number.parseFloat(percent);
    if (c.length < 2) {
      setError("El código debe tener al menos 2 caracteres.");
      return;
    }
    if (!Number.isFinite(p) || p < 1 || p > 100) {
      setError("El porcentaje debe estar entre 1 y 100.");
      return;
    }
    let expires_iso: string | undefined;
    if (expiresAt.trim()) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) {
        setError("Fecha de vencimiento inválida.");
        return;
      }
      expires_iso = d.toISOString();
    }
    setSaving(true);
    setError(null);
    try {
      await postJson<{ data: unknown }>(
        "/coupons",
        {
          code: c,
          percent: p,
          description: description.trim() || undefined,
          expires_at: expires_iso,
        },
        token,
      );
      setCode("");
      setDescription("");
      setExpiresAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cupón");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: AdminCoupon) {
    if (!token) return;
    setError(null);
    try {
      await patchJson(`/coupons/${c.id}`, token, { is_active: !c.is_active });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  async function removeCoupon(c: AdminCoupon) {
    if (!token) return;
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    setError(null);
    try {
      await deleteJson(`/coupons/${c.id}`, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
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
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Cupones</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Códigos con descuento porcentual sobre el total del pedido en el checkout (planes Pro y Mayorista).
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {plan === "STARTER" ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Los cupones están disponibles en planes Pro y Mayorista. Desde el registro podés elegir un plan superior o
          contactanos para actualizar tu cuenta.
        </p>
      ) : null}

      {plan && plan !== "STARTER" ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="font-semibold text-[#111827]">Nuevo cupón</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Código</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VERANO10"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm uppercase outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">% de descuento</label>
              <input
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Vencimiento (opcional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Nota interna (opcional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear cupón"}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#111827]">Cupones cargados</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[#6B7280]">Cargando…</p>
        ) : plan === "STARTER" ? null : rows.length === 0 ? (
          <p className="mt-4 text-sm text-[#9CA3AF]">Todavía no hay cupones.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-[#9CA3AF]">
                <tr>
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">%</th>
                  <th className="py-2 pr-4">Vence</th>
                  <th className="py-2 pr-4">Usos</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#374151]">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-mono font-medium">{c.code}</td>
                    <td className="py-3">{c.percent}%</td>
                    <td className="py-3 text-xs">{formatDate(c.expires_at)}</td>
                    <td className="py-3 text-xs">
                      {c.uses_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="py-3">{c.is_active ? "Activo" : "Inactivo"}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void toggleActive(c)}
                        className="mr-3 text-xs font-medium text-[#2563EB] hover:underline"
                      >
                        {c.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeCoupon(c)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
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
