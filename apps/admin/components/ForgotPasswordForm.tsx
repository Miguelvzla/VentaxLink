"use client";

import Link from "next/link";
import { useState } from "react";
import { postForgotPassword } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setLoading(true);
    try {
      const res = await postForgotPassword(email.trim());
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      {done ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {done}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {!done ? (
        <>
          <div>
            <label htmlFor="fp-email" className="mb-1 block text-sm font-medium text-[#374151]">
              Email de tu comercio
            </label>
            <input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
            />
            <p className="mt-1 text-xs text-[#9CA3AF]">
              El mismo mail con el que entrás al panel (el de la tienda al registrarte).
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#22C55E] py-3 font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </>
      ) : null}
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
