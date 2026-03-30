"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getJson, patchJson, type TenantMe } from "@/lib/api";
import { getToken } from "@/lib/auth";

type MeRes = { data: TenantMe };

function planLabel(plan: string) {
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

export function PuntosClient() {
  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [pointsEnabled, setPointsEnabled] = useState(false);
  const [arsPerPoint, setArsPerPoint] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [redeemPercent, setRedeemPercent] = useState("");
  const [redeemCost, setRedeemCost] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const me = await getJson<MeRes>("/tenant/me", token);
      setPlan(me.data.plan);
      setPointsEnabled(me.data.points_enabled);
      setArsPerPoint(me.data.points_ars_per_point ?? "");
      setMinBalance(
        me.data.points_redeem_min_balance != null ? String(me.data.points_redeem_min_balance) : "",
      );
      setRedeemPercent(me.data.points_redeem_percent ?? "");
      setRedeemCost(me.data.points_redeem_cost != null ? String(me.data.points_redeem_cost) : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (plan === "STARTER") return;

    const ars = Number(String(arsPerPoint).replace(",", "."));
    const minB = Number.parseInt(minBalance, 10);
    const pct = Number(String(redeemPercent).replace(",", "."));
    const cost = Number.parseInt(redeemCost, 10);

    if (pointsEnabled) {
      if (!Number.isFinite(ars) || ars < 0.01) {
        setError("Indicá cuántos pesos equivalen a 1 punto (ej. 1000).");
        return;
      }
      if (!Number.isFinite(minB) || minB < 1) {
        setError("Puntos mínimos para canjear debe ser al menos 1.");
        return;
      }
      if (!Number.isFinite(pct) || pct < 0.01 || pct > 100) {
        setError("El % de descuento al canjear debe estar entre 0,01 y 100.");
        return;
      }
      if (!Number.isFinite(cost) || cost < 1) {
        setError("El costo en puntos del canje debe ser al menos 1.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await patchJson<MeRes>(
        "/tenant/me",
        token,
        pointsEnabled
          ? {
              points_enabled: true,
              points_ars_per_point: ars,
              points_redeem_min_balance: minB,
              points_redeem_percent: pct,
              points_redeem_cost: cost,
            }
          : { points_enabled: false },
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
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

  if (loading) {
    return <p className="text-sm text-[#6B7280]">Cargando…</p>;
  }

  if (plan === "STARTER") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[#111827]">Puntos y beneficios</h1>
        <p className="text-sm text-[#6B7280]">
          El programa de puntos está incluido en planes Pro y Mayorista. En plan {planLabel(plan)} podés seguir usando
          cupones en el checkout.
        </p>
        <Link
          href="/dashboard/plan"
          className="inline-block rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Puntos y beneficios</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Los clientes suman puntos cuando marcás el pedido como entregado (según el total y los pesos por punto). En el
          checkout pueden canjear un descuento % si alcanzan el mínimo de puntos.{" "}
          <Link href="/dashboard/clientes" className="font-semibold text-[#2563EB] hover:underline">
            Ver puntos por cliente
          </Link>
          .
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[#374151]">
          <input
            type="checkbox"
            className="mt-1"
            checked={pointsEnabled}
            onChange={(e) => setPointsEnabled(e.target.checked)}
          />
          <span>
            <span className="font-medium text-[#111827]">Activar programa de puntos</span>
            <span className="mt-0.5 block text-[#6B7280]">
              Si está desactivado, no se muestran puntos en la tienda ni se acreditan al entregar pedidos.
            </span>
          </span>
        </label>

        {pointsEnabled ? (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Pesos (ARS) por 1 punto
              </label>
              <input
                required
                inputMode="decimal"
                value={arsPerPoint}
                onChange={(e) => setArsPerPoint(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#22C55E] focus:ring-2"
              />
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Ej. 1000 → por cada $1000 del total entregado, 1 punto. En cada producto se muestra cuántos puntos
                equivalen a su precio.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Puntos mínimos para poder canjear en el checkout
              </label>
              <input
                required
                inputMode="numeric"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Descuento al canjear (% sobre el total después del cupón)
              </label>
              <input
                required
                inputMode="decimal"
                value={redeemPercent}
                onChange={(e) => setRedeemPercent(e.target.value)}
                placeholder="10"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#22C55E] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Puntos que se descuentan al usar el canje
              </label>
              <input
                required
                inputMode="numeric"
                value={redeemCost}
                onChange={(e) => setRedeemCost(e.target.value)}
                placeholder="500"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#22C55E] focus:ring-2"
              />
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Cada vez que el cliente marca canjear en el pedido, se resta este saldo si el cupo y la configuración lo
                permiten.
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
