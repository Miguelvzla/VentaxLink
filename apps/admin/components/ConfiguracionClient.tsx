"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type TenantMe,
  getJson,
  patchJson,
  postUploadTenantBanner,
  postUploadTenantLogo,
} from "@/lib/api";
import { getStoredTenant, getToken, mergeStoredTenant } from "@/lib/auth";

type MeResponse = { data: TenantMe };

type FormState = {
  name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  google_maps_url: string;
  auto_whatsapp: boolean;
  notify_whatsapp_configured: boolean;
  plan: string;
  billing_reminder_enabled: boolean;
  billing_reminder_day_of_month: string;
  billing_reminder_hour: string;
  billing_reminder_subject: string;
  billing_reminder_body: string;
  billing_payment_alias: string;
  last_billing_reminder_sent_at: string | null;
};

function tenantToForm(t: TenantMe): FormState {
  return {
    name: t.name,
    description: t.description ?? "",
    logo_url: t.logo_url ?? "",
    banner_url: t.banner_url ?? "",
    primary_color: t.primary_color,
    secondary_color: t.secondary_color,
    phone: t.phone ?? "",
    email: t.email ?? "",
    whatsapp_number: t.whatsapp_number ?? "",
    address: t.address ?? "",
    instagram_url: t.instagram_url ?? "",
    facebook_url: t.facebook_url ?? "",
    tiktok_url: t.tiktok_url ?? "",
    google_maps_url: t.google_maps_url ?? "",
    auto_whatsapp: t.auto_whatsapp ?? true,
    notify_whatsapp_configured: t.notify_whatsapp_configured ?? false,
    plan: t.plan,
    billing_reminder_enabled: t.billing_reminder_enabled ?? false,
    billing_reminder_day_of_month:
      t.billing_reminder_day_of_month != null ? String(t.billing_reminder_day_of_month) : "",
    billing_reminder_hour: t.billing_reminder_hour != null ? String(t.billing_reminder_hour) : "",
    billing_reminder_subject: t.billing_reminder_subject ?? "",
    billing_reminder_body:
      t.billing_reminder_body ??
      `Hola,\n\nRecordatorio de cobro {{mes}} — {{comercio}}.\n\nDatos para transferir:\n{{alias}}\n\nEnviá el comprobante respondiendo este correo.\nPlan vigente hasta: {{plan_vence}}\n`,
    billing_payment_alias: t.billing_payment_alias ?? "",
    last_billing_reminder_sent_at: t.last_billing_reminder_sent_at ?? null,
  };
}

export function ConfiguracionClient() {
  const token = getToken();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<MeResponse>("/tenant/me", token);
      setForm(tenantToForm(res.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form) return;
    const hex = /^#[0-9A-Fa-f]{6}$/;
    if (!hex.test(form.primary_color) || !hex.test(form.secondary_color)) {
      setError("Los colores tienen que ser hex de 6 dígitos, por ejemplo #2563EB.");
      return;
    }
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone) {
      setError("El teléfono es obligatorio.");
      return;
    }
    if (!email) {
      setError("El email del comercio es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logo_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        phone,
        email,
        whatsapp_number: form.whatsapp_number.trim() || null,
        address: form.address.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        tiktok_url: form.tiktok_url.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
        auto_whatsapp: form.auto_whatsapp,
      };
      if (form.plan === "PRO" || form.plan === "WHOLESALE") {
        body.billing_payment_alias = form.billing_payment_alias.trim() || null;
        const bd = form.billing_reminder_day_of_month.trim();
        const bh = form.billing_reminder_hour.trim();
        if (form.billing_reminder_enabled) {
          const d = bd ? Number.parseInt(bd, 10) : NaN;
          const h = bh ? Number.parseInt(bh, 10) : NaN;
          if (!Number.isFinite(d) || d < 1 || d > 28) {
            setError("Día del mes: usá un número entre 1 y 28 (evita meses cortos).");
            setSaving(false);
            return;
          }
          if (!Number.isFinite(h) || h < 0 || h > 23) {
            setError("Hora: usá un número entre 0 y 23 (hora del servidor donde corre la API).");
            setSaving(false);
            return;
          }
          body.billing_reminder_enabled = true;
          body.billing_reminder_day_of_month = d;
          body.billing_reminder_hour = h;
          body.billing_reminder_subject = form.billing_reminder_subject.trim() || null;
          body.billing_reminder_body = form.billing_reminder_body.trim() || null;
          body.billing_payment_alias = form.billing_payment_alias.trim() || null;
        } else {
          body.billing_reminder_enabled = false;
        }
      }
      const res = await patchJson<MeResponse>("/tenant/me", token, body);
      setForm(tenantToForm(res.data));
      mergeStoredTenant({
        name: res.data.name,
        slug: res.data.slug,
        plan: res.data.plan,
      });
      setOk(true);
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

  const stored = getStoredTenant();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Configuración</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Datos públicos de tu tienda: marca, colores, contacto y redes. Lo que guardes se refleja en la tienda y en el panel.
        </p>
        {stored ? (
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Slug de tienda: <span className="font-mono">{stored.slug}</span> (no se puede cambiar desde acá todavía).
          </p>
        ) : null}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          Cambios guardados.
        </p>
      )}

      {loading || !form ? (
        <p className="text-sm text-[#6B7280]">Cargando…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Nombre del comercio</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">Descripción</label>
              <p className="mb-2 text-xs text-[#6B7280]">
                Se muestra en la tienda y como texto de vista previa cuando compartís el link (por ejemplo en WhatsApp,
                Instagram, etc.), junto al nombre y el logo.
              </p>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Color principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm((f) => (f ? { ...f, primary_color: e.target.value.toUpperCase() } : f))}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                />
                <input
                  required
                  pattern="^#[0-9A-Fa-f]{6}$"
                  value={form.primary_color}
                  onChange={(e) => setForm((f) => (f ? { ...f, primary_color: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Color secundario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, secondary_color: e.target.value.toUpperCase() } : f))
                  }
                  className="h-11 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                />
                <input
                  required
                  pattern="^#[0-9A-Fa-f]{6}$"
                  value={form.secondary_color}
                  onChange={(e) => setForm((f) => (f ? { ...f, secondary_color: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Logo (link público o archivo desde tu galería)
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                value={form.logo_url}
                onChange={(e) => setForm((f) => (f ? { ...f, logo_url: e.target.value } : f))}
                placeholder="https://… o subí abajo"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
              />
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                aria-label="Subir logo desde archivo o galería"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !token) return;
                  setLogoUploading(true);
                  setError(null);
                  try {
                    const { url } = await postUploadTenantLogo(token, file);
                    setForm((f) => (f ? { ...f, logo_url: url } : f));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo subir el logo");
                  } finally {
                    setLogoUploading(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={logoUploading}
                onClick={() => logoFileRef.current?.click()}
                className="mt-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
              >
                {logoUploading ? "Subiendo…" : "Subir logo (galería o archivos)"}
              </button>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#374151]">
                Banner (link público o archivo desde tu galería)
              </label>
              <input
                type="text"
                inputMode="url"
                autoComplete="off"
                value={form.banner_url}
                onChange={(e) => setForm((f) => (f ? { ...f, banner_url: e.target.value } : f))}
                placeholder="https://… o subí abajo"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
              />
              <input
                ref={bannerFileRef}
                type="file"
                accept="image/*"
                aria-label="Subir banner desde archivo o galería"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !token) return;
                  setBannerUploading(true);
                  setError(null);
                  try {
                    const { url } = await postUploadTenantBanner(token, file);
                    setForm((f) => (f ? { ...f, banner_url: url } : f));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo subir el banner");
                  } finally {
                    setBannerUploading(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={bannerUploading}
                onClick={() => bannerFileRef.current?.click()}
                className="mt-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-gray-50 disabled:opacity-50"
              >
                {bannerUploading ? "Subiendo…" : "Subir banner (galería o archivos)"}
              </button>
              <p className="mt-2 text-xs text-[#6B7280]">
                Tras subir, pulsá <strong>Guardar cambios</strong>. Para que los archivos no se borren al redesplegar el servidor, usá volumen persistente y <code className="rounded bg-gray-100 px-1">UPLOADS_DIR</code> en la API.
              </p>
            </div>
          </section>

          {/* Se oculta sección de avisos de pedido por requerimiento de producto. */}

          <section className="border-t border-gray-100 pt-6">
            <h2 className="font-semibold text-[#111827]">Contacto</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">Teléfono</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">WhatsApp (solo número)</label>
                <input
                  value={form.whatsapp_number}
                  onChange={(e) => setForm((f) => (f ? { ...f, whatsapp_number: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">Email del comercio</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              {form.plan === "PRO" || form.plan === "WHOLESALE" ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#374151]">
                    Alias para transferencias (visible al confirmar pedido)
                  </label>
                  <input
                    value={form.billing_payment_alias}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, billing_payment_alias: e.target.value } : f))
                    }
                    placeholder="ej. mi-negocio.mp"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                  />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">Dirección</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
            </div>
          </section>

          {/* SMTP del comercio: oculto por requerimiento de producto. */}

          {/* Se oculta sección de recordatorio mensual por requerimiento de producto. */}

          <section className="border-t border-gray-100 pt-6">
            <h2 className="font-semibold text-[#111827]">Redes</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">Instagram</label>
                <input
                  type="url"
                  value={form.instagram_url}
                  onChange={(e) => setForm((f) => (f ? { ...f, instagram_url: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">Facebook</label>
                <input
                  type="url"
                  value={form.facebook_url}
                  onChange={(e) => setForm((f) => (f ? { ...f, facebook_url: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">TikTok</label>
                <input
                  type="url"
                  value={form.tiktok_url}
                  onChange={(e) => setForm((f) => (f ? { ...f, tiktok_url: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[#374151]">Google Maps</label>
                <input
                  type="url"
                  value={form.google_maps_url}
                  onChange={(e) => setForm((f) => (f ? { ...f, google_maps_url: e.target.value } : f))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm text-[#374151] outline-none ring-[#2563EB] focus:ring-2"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
