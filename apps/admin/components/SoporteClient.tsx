"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, type TenantMe } from "@/lib/api";
import { getToken } from "@/lib/auth";

type MeRes = { data: TenantMe };

export function SoporteClient() {
  const router = useRouter();
  const token = getToken();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [commerce, setCommerce] = useState("");
  const [message, setMessage] = useState("");
  const [tenantEmail, setTenantEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const me = await getJson<MeRes>("/tenant/me", token);
      setPlan(me.data.plan);
      setTenantEmail(me.data.email?.trim() || null);
      if (me.data.plan === "STARTER") {
        router.replace("/dashboard");
        return;
      }
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

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

  if (loading) {
    return <p className="text-sm text-[#6B7280]">Cargando…</p>;
  }

  if (plan === "STARTER") {
    return <p className="text-sm text-[#6B7280]">Cargando…</p>;
  }

  if (plan !== "PRO" && plan !== "WHOLESALE") {
    return (
      <p className="text-sm text-[#6B7280]">
        No se pudo verificar tu plan.{" "}
        <Link href="/dashboard" className="font-semibold text-[#2563EB] hover:underline">
          Volver al panel
        </Link>
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSendError(null);
    setSending(true);
    try {
      await postJson<{ ok: boolean }>("/public/contact", {
        name: name.trim(),
        commerce: commerce.trim(),
        message: message.trim(),
        reply_email: tenantEmail || undefined,
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Soporte comercial</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Escribinos para upgrades de plan, facturación o acompañamiento. El mensaje se envía por correo al equipo
          VentaXLink (configuración en el servidor: SMTP y bandeja de contacto).
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-900">
          Listo. Recibimos tu mensaje y te vamos a responder a tu email de cuenta
          {tenantEmail ? (
            <>
              {" "}
              (<span className="font-mono">{tenantEmail}</span>)
            </>
          ) : null}
          .
        </div>
      ) : null}

      {sendError ? (
        <p className="text-sm text-red-600" role="alert">
          {sendError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Tu nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Nombre del comercio / link de tienda</label>
          <input
            value={commerce}
            onChange={(e) => setCommerce(e.target.value)}
            placeholder="Ej. Mi negocio o mi-tienda"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#374151]">Mensaje</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#2563EB] focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={sending || sent}
          className="w-full rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {sending ? "Enviando…" : sent ? "Enviado" : "Enviar mensaje"}
        </button>
      </form>
    </div>
  );
}
