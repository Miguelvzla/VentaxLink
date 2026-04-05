"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isTenantTokenValid, postJson, type AuthResponse } from "@/lib/api";
import { clearSession, getToken, saveSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    let cancelled = false;
    void isTenantTokenValid(t).then((ok) => {
      if (cancelled) return;
      if (ok) router.replace("/dashboard");
      else clearSession();
    });
    return () => {
      cancelled = true;
    };
  }, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postJson<AuthResponse>("/auth/login", { email, password });
      saveSession(res);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#374151]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#374151]">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] py-3 pl-4 pr-12 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center rounded-xl bg-[#22C55E] py-3 font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar al panel"}
      </button>
      <p className="text-center text-sm text-[#6B7280]">
        ¿Todavía no tenés tienda?{" "}
        <Link href="/register" className="font-semibold text-[#2563EB] hover:underline">
          Creala gratis
        </Link>
      </p>
    </form>
  );
}
