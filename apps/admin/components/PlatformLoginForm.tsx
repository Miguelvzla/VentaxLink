"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isPlatformTokenValid, postJson } from "@/lib/api";
import {
  clearPlatformSession,
  getPlatformToken,
  savePlatformToken,
} from "@/lib/platform-session";

type PlatformLoginResponse = {
  access_token: string;
  admin: { id: string; email: string; name: string | null };
};

export function PlatformLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = getPlatformToken();
    if (!t) return;
    let cancelled = false;
    void isPlatformTokenValid(t).then((ok) => {
      if (cancelled) return;
      if (ok) router.replace("/platform/tenants");
      else clearPlatformSession();
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postJson<PlatformLoginResponse>("/platform-auth/login", {
        email,
        password,
      });
      savePlatformToken(res.access_token);
      router.push("/platform/tenants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      {error && (
        <p className="rounded-xl bg-red-950/80 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="p-email" className="mb-1 block text-sm font-medium text-slate-300">
          Email
        </label>
        <input
          id="p-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white outline-none ring-emerald-500 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="p-password" className="mb-1 block text-sm font-medium text-slate-300">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="p-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 py-3 pl-4 pr-12 text-white outline-none ring-emerald-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="text-slate-300 hover:underline">
          Volver al panel de comercios
        </Link>
      </p>
    </form>
  );
}
