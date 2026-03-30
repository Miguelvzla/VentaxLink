"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getJson, patchJson, type TenantMe } from "@/lib/api";
import { getToken, mergeStoredTenant } from "@/lib/auth";

type MeRes = { data: TenantMe };
type PlanChoice = "STARTER" | "PRO" | "WHOLESALE";

function label(p: PlanChoice) {
  switch (p) {
    case "STARTER":
      return "Inicio";
    case "PRO":
      return "Pro";
    case "WHOLESALE":
      return "Mayorista";
  }
}

const webOrigin = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const planesHref = `${webOrigin.replace(/\/$/, "")}/#planes`;

type Props = { initialDesired?: PlanChoice };

export function PlanUpgradeClient({ initialDesired }: Props) {
  const router = useRouter();
  const token = getToken();
  const [current, setCurrent] = useState<PlanChoice | null>(null);
  const [selected, setSelected] = useState<PlanChoice>("PRO");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<MeRes>("/tenant/me", token);
      const p = res.data.plan as PlanChoice;
      setCurrent(p);
      if (initialDesired && ["STARTER", "PRO", "WHOLESALE"].includes(initialDesired)) {
        setSelected(initialDesired);
      } else if (p === "STARTER") {
        setSelected("PRO");
      } else {
        setSelected(p);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar tu plan");
    } finally {
      setLoading(false);
    }
  }, [token, initialDesired]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    if (!token || selected == null) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await patchJson<MeRes>("/tenant/me", token, { plan: selected });
      const newPlan = res.data.plan;
      mergeStoredTenant({ plan: newPlan });
      window.dispatchEvent(new Event("ventaxlink-plan"));
      setOk(true);
      setCurrent(newPlan as PlanChoice);
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el plan");
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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Plan de tu comercio</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Elegí el plan que corresponda. El cobro recurrente se coordina aparte; acá actualizás los límites del sistema
          (productos, cupones, etc.).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Cargando…</p>
      ) : (
        <>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-[#374151]">
            Plan actual: <strong>{current != null ? label(current) : "—"}</strong>
          </p>

          <fieldset className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <legend className="px-1 text-sm font-medium text-[#374151]">Nuevo plan</legend>
            {(
              [
                { value: "STARTER" as const, hint: "Hasta 20 productos, sin cupones en panel" },
                { value: "PRO" as const, hint: "Hasta 100 productos, cupones, más fotos" },
                { value: "WHOLESALE" as const, hint: "Escala mayorista / B2B (cotización)" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 text-sm ${
                  selected === opt.value
                    ? "border-[#2563EB] bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-[#111827]">{label(opt.value)}</span>
                  <span className="mt-0.5 block text-xs text-[#6B7280]">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
              Plan actualizado. Redirigiendo al panel…
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || selected === current}
              onClick={() => void onSave()}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar plan"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-gray-50"
            >
              Volver al panel
            </Link>
          </div>

          <p className="text-xs text-[#9CA3AF]">
            Precios y condiciones comerciales en la{" "}
            <a href={planesHref} className="font-medium text-[#2563EB] underline" target="_blank" rel="noreferrer">
              web pública
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
