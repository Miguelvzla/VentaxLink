"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { postResetPassword } from "@/lib/api";

type Props = { initialToken: string };

export function ResetPasswordForm({ initialToken }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = initialToken.trim();
    if (t.length < 64) {
      setError("Falta el enlace completo. Abrí el link del correo o pedí uno nuevo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await postResetPassword(t, password);
      setDone(res.message);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  if (!initialToken.trim()) {
    return (
      <div className="mt-8 space-y-4 text-center">
        <p className="text-sm text-red-800">Este enlace no es válido. Pedí uno nuevo desde “Olvidé mi contraseña”.</p>
        <Link href="/forgot-password" className="font-semibold text-[#2563EB] hover:underline">
          Pedir enlace
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      {done ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900" role="status">
          {done}
          <span className="mt-2 block text-xs text-emerald-800">Redirigiendo al inicio de sesión…</span>
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
            <label htmlFor="rp-pass" className="mb-1 block text-sm font-medium text-[#374151]">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="rp-pass"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] py-3 pl-4 pr-12 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] hover:bg-gray-200/80"
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="rp-pass2" className="mb-1 block text-sm font-medium text-[#374151]">
              Repetir contraseña
            </label>
            <input
              id="rp-pass2"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#22C55E] py-3 font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </>
      ) : null}
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
          Ir al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
