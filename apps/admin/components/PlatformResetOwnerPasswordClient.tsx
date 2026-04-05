"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getJsonPlatform, postJsonPlatform } from "@/lib/api";
import { clearPlatformSession, getPlatformToken } from "@/lib/platform-session";

type TenantOption = {
  id: string;
  slug: string;
  name: string;
  email: string;
  plan: string;
  status: string;
};

type ListResponse = { data: TenantOption[] };

type ResetResponse = {
  data: {
    temporary_password: string;
    user_email: string;
    user_name: string;
    tenant_name: string;
    tenant_slug: string;
    tenant_email: string;
    message: string;
  };
};

export function PlatformResetOwnerPasswordClient() {
  const token = useMemo(() => getPlatformToken(), []);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetResponse["data"] | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    setError(null);
    try {
      const res = await getJsonPlatform<ListResponse>("/platform/tenants", token);
      setTenants(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar comercios");
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  function logout() {
    clearPlatformSession();
    window.location.href = "/platform/login";
  }

  async function onReset() {
    if (!token || !selectedId) return;
    setError(null);
    setResult(null);
    if (!window.confirm("¿Generar contraseña provisoria para el titular (OWNER) de este comercio? La clave actual dejará de funcionar.")) {
      return;
    }
    setWorking(true);
    try {
      const res = await postJsonPlatform<ResetResponse>(
        `/platform/tenants/${selectedId}/reset-owner-password`,
        token,
        {},
      );
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reiniciar la contraseña");
    } finally {
      setWorking(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reset de acceso (titular)</h1>
          <p className="mt-1 text-sm text-slate-400">
            Herramienta para super administradores: generá una <strong className="text-slate-300">contraseña provisoria</strong>{" "}
            para el usuario <strong className="text-slate-300">OWNER</strong> del comercio. El comercio puede cambiarla
            luego desde el panel. Los comercios también pueden usar{" "}
            <span className="text-emerald-400">Olvidé mi contraseña</span> en el login del panel (correo con Resend).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/platform/tenants"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            ← Comercios
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Salir
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
        <h2 className="text-sm font-semibold text-amber-200">Uso responsable</h2>
        <p className="mt-1 text-xs text-amber-100/80">
          La contraseña se muestra una sola vez. Comunicala por un canal seguro (teléfono verificado, ticket interno, etc.).
          Queda registro en logs del servidor al ejecutar el reset.
        </p>
      </section>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4">
          <p className="text-sm font-medium text-emerald-200">{result.message}</p>
          <dl className="mt-3 space-y-1 text-sm text-slate-300">
            <div>
              <dt className="text-slate-500">Comercio</dt>
              <dd>
                {result.tenant_name} <span className="text-slate-500">({result.tenant_slug})</span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Email titular</dt>
              <dd className="font-mono text-xs">{result.user_email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contraseña provisoria</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-emerald-800 bg-slate-950 px-3 py-2 font-mono text-sm text-emerald-100">
                  {result.temporary_password}
                </code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(result.temporary_password)}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Copiar
                </button>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-4 text-sm text-slate-400 underline hover:text-white"
            onClick={() => {
              setResult(null);
              setSelectedId("");
            }}
          >
            Hacer otro reset
          </button>
        </div>
      ) : null}

      {!result ? (
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="reset-search" className="mb-1 block text-sm font-medium text-slate-300">
              Buscar comercio
            </label>
            <input
              id="reset-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, slug o email del comercio…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none ring-emerald-500 focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="reset-tenant" className="mb-1 block text-sm font-medium text-slate-300">
              Comercio
            </label>
            <select
              id="reset-tenant"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingList || filtered.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none ring-emerald-500 focus:ring-2 disabled:opacity-50"
            >
              <option value="">{loadingList ? "Cargando…" : "Elegí un comercio"}</option>
              {filtered.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.slug} · {t.email}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!selectedId || working}
            onClick={() => void onReset()}
            className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {working ? "Procesando…" : "Generar contraseña provisoria del titular"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
