"use client";

import { useState } from "react";
import { postStoreMailTest } from "@/lib/api";

type Props = {
  slug: string;
  primaryColor: string;
  plan: string;
  mailTestAvailable?: boolean;
};

export function ProMailTestButton({ slug, primaryColor, plan, mailTestAvailable }: Props) {
  const isPro = plan === "PRO" || plan === "WHOLESALE";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Solo visible con ENABLE_STORE_SMTP_TEST en la API: evita texto técnico y botón gris en la tienda pública. */
  if (!isPro || mailTestAvailable !== true) return null;

  async function onSend() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const r = await postStoreMailTest(slug);
      setMessage(r.to_hint ? `${r.message} (destino: ${r.to_hint})` : r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-dashed border-gray-200 bg-[#FAFAFA]/90 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[#111827]">Prueba de correo</h3>
      <p className="mt-1 text-xs text-[#6B7280]">
        Envía un correo de prueba desde el servidor. Si no llega, revisá los logs de la API (filtrá por{" "}
        <code className="rounded bg-gray-100 px-1">mail-test</code>).
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={onSend}
        className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "Enviando…" : "Enviar mail de prueba"}
      </button>
      {message ? <p className="mt-2 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
