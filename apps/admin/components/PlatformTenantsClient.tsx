"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getJsonPlatform, patchJsonPlatform, postJsonPlatform } from "@/lib/api";
import { downloadXlsx } from "@/lib/exportExcel";
import { clearPlatformSession, getPlatformToken } from "@/lib/platform-session";
import { whatsappMeUrlFromPhone } from "@/lib/whatsapp";

const storeOrigin = process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003";

const DEFAULT_BILLING_BODY = `Hola,

Recordatorio de cobro {{mes}} — {{comercio}}.

Datos para transferir:
{{alias}}

Enviá el comprobante respondiendo este correo.
Plan vigente hasta: {{plan_vence}}
`;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  created_at: string;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  billing_hold_message: string | null;
  billing_reminder_enabled: boolean;
  billing_reminder_day_of_month: number | null;
  billing_reminder_hour: number | null;
  billing_reminder_subject: string | null;
  billing_reminder_body: string | null;
  billing_payment_alias: string | null;
  last_billing_reminder_sent_at: string | null;
  _count: { products: number; users: number; orders: number };
  store_visit_count: number;
  last_panel_login_at: string | null;
};

type ListResponse = { data: TenantRow[] };

type PlanTab = "ALL" | "STARTER" | "PRO" | "WHOLESALE";

function planLabel(p: string): string {
  switch (p) {
    case "STARTER":
      return "Inicio";
    case "PRO":
      return "Pro";
    case "WHOLESALE":
      return "Mayorista";
    default:
      return p;
  }
}

function formatPanelLogin(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case "TRIAL":
      return "Prueba";
    case "ACTIVE":
      return "Activo";
    case "SUSPENDED":
      return "Suspendido (mora)";
    case "CANCELLED":
      return "Cancelado";
    default:
      return s;
  }
}

export function PlatformTenantsClient() {
  const token = getPlatformToken();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<PlanTab>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendFor, setSuspendFor] = useState<TenantRow | null>(null);
  const [holdMessage, setHoldMessage] = useState("");
  const [cancelFor, setCancelFor] = useState<TenantRow | null>(null);
  const [cancelResult, setCancelResult] = useState<string | null>(null);

  const [configFor, setConfigFor] = useState<TenantRow | null>(null);
  const [planExpiresInput, setPlanExpiresInput] = useState("");
  const [brEnabled, setBrEnabled] = useState(false);
  const [brDay, setBrDay] = useState("");
  const [brHour, setBrHour] = useState("");
  const [brSubject, setBrSubject] = useState("");
  const [brBody, setBrBody] = useState("");
  const [brAlias, setBrAlias] = useState("");
  const [termsText, setTermsText] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!configFor) return;
    setPlanExpiresInput(isoToDateInput(configFor.plan_expires_at));
    setBrEnabled(!!configFor.billing_reminder_enabled);
    setBrDay(
      configFor.billing_reminder_day_of_month != null
        ? String(configFor.billing_reminder_day_of_month)
        : "",
    );
    setBrHour(configFor.billing_reminder_hour != null ? String(configFor.billing_reminder_hour) : "");
    setBrSubject(configFor.billing_reminder_subject ?? "");
    setBrBody(configFor.billing_reminder_body?.trim() ? configFor.billing_reminder_body : DEFAULT_BILLING_BODY);
    setBrAlias(configFor.billing_payment_alias ?? "");
  }, [configFor]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const q = debouncedSearch
        ? `?q=${encodeURIComponent(debouncedSearch)}`
        : "";
      const res = await getJsonPlatform<ListResponse>(`/platform/tenants${q}`, token);
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar comercios");
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    void getJsonPlatform<{ data: { terms: string } }>(
      "/platform/tenants/settings/marketplace-terms",
      token,
    )
      .then((res) => setTermsText(res.data.terms ?? ""))
      .catch(() => undefined);
  }, [token]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return rows;
    return rows.filter((r) => r.plan === tab);
  }, [rows, tab]);

  function logout() {
    clearPlatformSession();
    window.location.href = "/platform/login";
  }

  async function activateTenant(id: string) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await patchJsonPlatform(`/platform/tenants/${id}`, token, { status: "ACTIVE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reactivar");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSuspend() {
    if (!token || !suspendFor) return;
    setBusyId(suspendFor.id);
    setError(null);
    try {
      const m = holdMessage.trim();
      await patchJsonPlatform(`/platform/tenants/${suspendFor.id}`, token, {
        status: "SUSPENDED",
        ...(m ? { billing_hold_message: m } : {}),
      });
      setSuspendFor(null);
      setHoldMessage("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo suspender");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    if (!token || !cancelFor) return;
    setBusyId(cancelFor.id);
    setError(null);
    try {
      const res = await postJsonPlatform<{ ok: boolean; message: string }>(
        `/platform/tenants/${cancelFor.id}/cancel`,
        token,
        {},
      );
      setCancelResult(res.message ?? "Cuenta cancelada correctamente.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar");
      setCancelFor(null);
    } finally {
      setBusyId(null);
    }
  }

  async function savePlanAndBilling() {
    if (!token || !configFor) return;
    setBusyId(configFor.id);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        plan_expires_at: planExpiresInput.trim() ? planExpiresInput.trim() : null,
      };
      const isPaidPlan = configFor.plan === "PRO" || configFor.plan === "WHOLESALE";
      if (isPaidPlan) {
        if (brEnabled) {
          const d = Number.parseInt(brDay, 10);
          const h = Number.parseInt(brHour, 10);
          if (!Number.isFinite(d) || d < 1 || d > 28) {
            setError("Día del mes: entre 1 y 28.");
            setBusyId(null);
            return;
          }
          if (!Number.isFinite(h) || h < 0 || h > 23) {
            setError("Hora: entre 0 y 23 (servidor API).");
            setBusyId(null);
            return;
          }
          const subj = brSubject.trim();
          const btxt = brBody.trim();
          const als = brAlias.trim();
          if (!subj || !btxt || !als) {
            setError("Con recordatorio activo: asunto, descripción y datos de pago son obligatorios.");
            setBusyId(null);
            return;
          }
          body.billing_reminder_enabled = true;
          body.billing_reminder_day_of_month = d;
          body.billing_reminder_hour = h;
          body.billing_reminder_subject = subj;
          body.billing_reminder_body = btxt;
          body.billing_payment_alias = als;
        } else {
          body.billing_reminder_enabled = false;
        }
      }
      await patchJsonPlatform(`/platform/tenants/${configFor.id}`, token, body);
      setConfigFor(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusyId(null);
    }
  }

  function exportExcel() {
    const list = filtered;
    if (list.length === 0) return;
    const rowsX = list.map((t) => ({
      Nombre: t.name,
      Slug: t.slug,
      Email: t.email,
      Teléfono: t.phone,
      Plan: planLabel(t.plan),
      Estado: statusLabel(t.status),
      Alta: formatDateOnly(t.created_at),
      Vence_plan: formatDateOnly(t.plan_expires_at),
      Prueba_hasta: formatDateOnly(t.trial_ends_at),
      Rec_mail_cobro: t.billing_reminder_enabled ? "Sí" : "No",
      Día_hora_mail: t.billing_reminder_enabled
        ? `${t.billing_reminder_day_of_month ?? "—"} / ${t.billing_reminder_hour ?? "—"}`
        : "—",
      Último_mail_cobro: t.last_billing_reminder_sent_at
        ? formatPanelLogin(t.last_billing_reminder_sent_at)
        : "—",
      Visitas_tienda: t.store_visit_count ?? 0,
      Pedidos: t._count.orders,
      Productos: t._count.products,
      Usuarios_panel: t._count.users,
      Último_acceso_panel: formatPanelLogin(t.last_panel_login_at),
    }));
    downloadXlsx(
      `comercios-plataforma-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Comercios",
      rowsX,
    );
  }

  async function saveMarketplaceTerms() {
    if (!token) return;
    setError(null);
    try {
      await patchJsonPlatform("/platform/tenants/settings/marketplace-terms", token, {
        terms: termsText,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar términos");
    }
  }

  if (!token) {
    return null;
  }

  const tabs: { key: PlanTab; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "STARTER", label: "Inicio" },
    { key: "PRO", label: "Pro" },
    { key: "WHOLESALE", label: "Mayorista" },
  ];

  const isPaidConfig = configFor && (configFor.plan === "PRO" || configFor.plan === "WHOLESALE");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Comercios registrados</h1>
          <p className="mt-1 text-sm text-slate-400">
            Visitas a la tienda pública, pedidos, vencimiento de plan, recordatorio de cobro por mail, último acceso al
            panel, búsqueda por comercio, contacto o usuario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/platform/reset-claves"
            className="rounded-xl border border-amber-700/80 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/40"
          >
            Reset acceso titular
          </Link>
          <button
            type="button"
            disabled={loading || filtered.length === 0}
            onClick={exportExcel}
            className="rounded-xl border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-50"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="platform-tenant-search" className="sr-only">
          Buscar comercios
        </label>
        <input
          id="platform-tenant-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nombre de tienda, slug, email, teléfono o usuario del panel…"
          className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none ring-emerald-500 focus:ring-2"
        />
        {debouncedSearch ? (
          <p className="mt-2 text-xs text-slate-500">
            Filtrando por «{debouncedSearch}» · {rows.length} resultado{rows.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold text-white">Términos marketplace (registro y checkout)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Este texto lo aceptan comercios al registrarse y clientes al confirmar pedidos.
        </p>
        <textarea
          rows={4}
          value={termsText}
          onChange={(e) => setTermsText(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void saveMarketplaceTerms()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Guardar términos
          </button>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t.label}
            {t.key !== "ALL" ? (
              <span className="ml-1.5 text-xs opacity-80">
                ({rows.filter((r) => r.plan === t.key).length})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        {loading ? (
          <p className="p-8 text-center text-slate-500">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No hay comercios en esta solapa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Comercio</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 whitespace-nowrap">Vence plan</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 whitespace-nowrap">Mail cobro</th>
                  <th className="px-4 py-3 whitespace-nowrap">Visitas tienda</th>
                  <th className="px-4 py-3 whitespace-nowrap">Pedidos</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3 whitespace-nowrap">Último acceso panel</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filtered.map((t) => {
                  const waLink = whatsappMeUrlFromPhone(t.phone);
                  return (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="font-mono text-xs text-slate-500">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{t.email}</p>
                      <p className="mt-1 text-slate-400">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
                            title="Abrir chat en WhatsApp (web o app)"
                          >
                            {t.phone}
                            <span className="text-[10px] font-sans font-normal text-emerald-500/90">(WA)</span>
                          </a>
                        ) : (
                          <span className="font-mono">{t.phone}</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">{planLabel(t.plan)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-200">
                      {t.plan === "PRO" || t.plan === "WHOLESALE"
                        ? formatDateOnly(t.plan_expires_at)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{statusLabel(t.status)}</td>
                    <td className="px-4 py-3 text-xs">
                      {t.plan === "PRO" || t.plan === "WHOLESALE" ? (
                        <span
                          className={
                            t.billing_reminder_enabled ? "text-emerald-400" : "text-slate-500"
                          }
                        >
                          {t.billing_reminder_enabled
                            ? `Sí · ${t.billing_reminder_day_of_month ?? "?"}/${t.billing_reminder_hour ?? "?"}`
                            : "No"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-slate-200">
                      {t.store_visit_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums font-medium text-white">
                      {t._count.orders}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {t._count.products} prod. · {t._count.users} usr.
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                      {formatPanelLogin(t.last_panel_login_at ?? null)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <a
                          href={`${storeOrigin}/tienda/${t.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-emerald-400 hover:underline"
                        >
                          Ver tienda
                        </a>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => setConfigFor(t)}
                          className="text-xs font-medium text-sky-400 hover:underline disabled:opacity-50"
                        >
                          Plan y cobro (mail)
                        </button>
                        {t.status === "SUSPENDED" ? (
                          <button
                            type="button"
                            disabled={busyId === t.id}
                            onClick={() => void activateTenant(t.id)}
                            className="text-xs font-medium text-sky-400 hover:underline disabled:opacity-50"
                          >
                            {busyId === t.id ? "…" : "Reactivar"}
                          </button>
                        ) : t.status === "ACTIVE" || t.status === "TRIAL" ? (
                          <button
                            type="button"
                            disabled={busyId === t.id}
                            onClick={() => {
                              setHoldMessage(t.billing_hold_message ?? "");
                              setSuspendFor(t);
                            }}
                            className="text-xs font-medium text-amber-400 hover:underline disabled:opacity-50"
                          >
                            Suspender (mora)
                          </button>
                        ) : null}
                        {t.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={busyId === t.id}
                            onClick={() => setCancelFor(t)}
                            className="text-xs font-medium text-red-400 hover:underline disabled:opacity-50"
                          >
                            Cancelar cuenta
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {suspendFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Suspender por mora</h2>
            <p className="mt-2 text-sm text-slate-400">
              {suspendFor.name}: la tienda pública pasará a mostrar solo 20 productos y el mensaje de pago pendiente.
              Los datos del comercio se conservan.
            </p>
            <label className="mt-4 block text-sm text-slate-300">
              Mensaje en la tienda (opcional; si lo dejás vacío se usa el texto por defecto)
              <textarea
                rows={4}
                value={holdMessage}
                onChange={(e) => setHoldMessage(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuspendFor(null);
                  setHoldMessage("");
                }}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === suspendFor.id}
                onClick={() => void confirmSuspend()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {busyId === suspendFor.id ? "Guardando…" : "Confirmar suspensión"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {configFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Plan y recordatorio de cobro</h2>
            <p className="mt-2 text-sm text-slate-400">{configFor.name}</p>

            <label className="mt-4 block text-sm text-slate-300">
              Vencimiento del plan
              <input
                type="date"
                value={planExpiresInput}
                onChange={(e) => setPlanExpiresInput(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Vacío = sin fecha guardada. Para Pro/Mayorista activos, el sistema suma un mes al vencimiento en el día/hora
                de cobro (o día 1 a las 9) una vez por mes.
              </span>
            </label>

            {isPaidConfig ? (
              <div className="mt-6 border-t border-slate-800 pt-6">
                <p className="text-sm font-medium text-white">Mail automático de cobro (Pro / Mayorista)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Requiere SMTP del comercio o del servidor. Hora según servidor API (cron horario).
                </p>
                {configFor.last_billing_reminder_sent_at ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Último envío: {formatPanelLogin(configFor.last_billing_reminder_sent_at)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Aún no se envió un recordatorio automático.</p>
                )}
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={brEnabled}
                    onChange={(e) => setBrEnabled(e.target.checked)}
                  />
                  Activar recordatorio mensual
                </label>
                {brEnabled ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-xs text-slate-400">
                        Día del mes (1–28)
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={brDay}
                          onChange={(e) => setBrDay(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block text-xs text-slate-400">
                        Hora (0–23)
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={brHour}
                          onChange={(e) => setBrHour(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
                        />
                      </label>
                    </div>
                    <label className="block text-xs text-slate-400">
                      Asunto
                      <input
                        value={brSubject}
                        onChange={(e) => setBrSubject(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
                        placeholder="Cobro mensual — {{comercio}}"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">
                      Cuerpo (variables: {"{{comercio}}, {{alias}}, {{plan_vence}}, {{mes}}"})
                      <textarea
                        rows={6}
                        value={brBody}
                        onChange={(e) => setBrBody(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 font-mono text-xs text-white"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">
                      Alias / CBU / datos de pago
                      <textarea
                        rows={3}
                        value={brAlias}
                        onChange={(e) => setBrAlias(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setConfigFor(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === configFor.id}
                onClick={() => void savePlanAndBilling()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busyId === configFor.id ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal confirmar cancelación */}
      {cancelFor && !cancelResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-red-300">Cancelar cuenta</h2>
            <p className="mt-3 text-sm text-slate-300">
              Vas a cancelar la cuenta de <strong className="text-white">{cancelFor.name}</strong>{" "}
              (<span className="font-mono text-slate-400">{cancelFor.email}</span>).
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
              <li>• El estado pasa a <strong className="text-red-300">CANCELADO</strong></li>
              <li>• Todos los usuarios del panel quedan desactivados</li>
              <li>• El email <strong className="text-white">{cancelFor.email}</strong> queda libre para re-registro</li>
              <li>• Los datos de la tienda (productos, pedidos) se conservan</li>
            </ul>
            <p className="mt-3 text-xs font-medium text-amber-400">Esta acción no se puede deshacer fácilmente.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelFor(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === cancelFor.id}
                onClick={() => void confirmCancel()}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {busyId === cancelFor.id ? "Procesando…" : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal resultado cancelación */}
      {cancelResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-900/60 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-emerald-300">Cuenta cancelada</h2>
            <p className="mt-3 text-sm text-slate-300">{cancelResult}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { setCancelResult(null); setCancelFor(null); }}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-slate-600">
        <Link href="/login" className="hover:text-slate-400">
          Panel comercios
        </Link>
      </p>
    </div>
  );
}
