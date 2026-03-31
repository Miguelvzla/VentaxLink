"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { postJson, type AuthResponse } from "@/lib/api";
import { getToken, saveSession } from "@/lib/auth";

/** Base pública `/tienda` — prioriza NEXT_PUBLIC_STORE_URL (ej. https://store.ventaxlink.ar/tienda). */
const storePublicBase = (() => {
  const url = process.env.NEXT_PUBLIC_STORE_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  const origin = (process.env.NEXT_PUBLIC_STORE_ORIGIN ?? "http://localhost:3003").replace(
    /\/+$/,
    "",
  );
  return `${origin}/tienda`;
})();

type PlanChoice = "STARTER" | "PRO" | "WHOLESALE";

function slugifyHint(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type RegisterFormProps = { initialPlan?: PlanChoice };

export function RegisterForm({ initialPlan }: RegisterFormProps) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    if (initialPlan) {
      router.replace(`/dashboard/plan?plan=${initialPlan}`);
    } else {
      router.replace("/dashboard");
    }
  }, [router, initialPlan]);

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [plan, setPlan] = useState<PlanChoice>(initialPlan ?? "STARTER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    const s = slug.trim().toLowerCase() || "tu-link";
    return `${storePublicBase}/${s}`;
  }, [slug]);

  function onStoreNameChange(v: string) {
    setStoreName(v);
    if (!slugTouched) setSlug(slugifyHint(v));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await postJson<AuthResponse>("/auth/register", {
        storeName,
        slug: slug.trim().toLowerCase(),
        email,
        phone,
        password,
        plan,
        ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
      });
      saveSession(res);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tienda.");
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
        <label htmlFor="storeName" className="mb-1 block text-sm font-medium text-[#374151]">
          Nombre del comercio
        </label>
        <input
          id="storeName"
          name="storeName"
          required
          autoComplete="organization"
          value={storeName}
          onChange={(e) => onStoreNameChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-[#374151]">
          Tu link (solo letras minúsculas, números y guiones)
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Ejemplo: mi-negocio"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 font-mono text-sm text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
        <p className="mt-1 text-xs text-[#9CA3AF]">
          Dirección pública de tu tienda:{" "}
          <span className="font-mono text-[#374151] break-all">{previewUrl}</span>
        </p>
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#374151]">
          Email (para entrar al panel)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[#374151]">
          Teléfono del comercio
        </label>
        <input
          id="phone"
          name="phone"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
      </div>
      <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-[#FAFAFA] p-4">
        <legend className="px-1 text-sm font-medium text-[#374151]">Plan</legend>
        <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent bg-white p-3 has-[:checked]:border-[#22C55E] has-[:checked]:ring-1 has-[:checked]:ring-[#22C55E]">
          <input
            type="radio"
            name="plan"
            checked={plan === "STARTER"}
            onChange={() => setPlan("STARTER")}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-[#111827]">Inicio — gratis</span>
            <span className="block text-xs text-[#6B7280]">
              Catálogo y ventas sin costo. Ideal para empezar.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent bg-white p-3 has-[:checked]:border-[#2563EB] has-[:checked]:ring-1 has-[:checked]:ring-[#2563EB]">
          <input
            type="radio"
            name="plan"
            checked={plan === "PRO"}
            onChange={() => setPlan("PRO")}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-[#111827]">Pro — pago</span>
            <span className="block text-xs text-[#6B7280]">
              Más volumen y funciones avanzadas. Te contactamos para activar y cobrar.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent bg-white p-3 has-[:checked]:border-[#2563EB] has-[:checked]:ring-1 has-[:checked]:ring-[#2563EB]">
          <input
            type="radio"
            name="plan"
            checked={plan === "WHOLESALE"}
            onChange={() => setPlan("WHOLESALE")}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-[#111827]">Mayorista — pago plus</span>
            <span className="block text-xs text-[#6B7280]">
              Reglas para mayoristas y cuentas grandes. Cotización aparte.
            </span>
          </span>
        </label>
      </fieldset>
      <div>
        <label htmlFor="ownerName" className="mb-1 block text-sm font-medium text-[#374151]">
          Tu nombre (opcional)
        </label>
        <input
          id="ownerName"
          name="ownerName"
          autoComplete="name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] px-4 py-3 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#374151]">
          Contraseña (mínimo 8 caracteres)
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
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
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-[#374151]">
          Repetir contraseña
        </label>
        <div className="relative">
          <input
            id="confirm"
            name="confirm"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-[#F3F4F6] py-3 pl-4 pr-12 text-[#374151] outline-none ring-[#22C55E] focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6B7280] hover:bg-gray-200/80 hover:text-[#111827]"
            aria-label={showConfirm ? "Ocultar repetición de contraseña" : "Mostrar repetición de contraseña"}
          >
            {showConfirm ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center rounded-xl bg-[#22C55E] py-3 font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
      >
        {loading ? "Creando…" : "Crear mi tienda"}
      </button>
      <p className="text-center text-sm text-[#6B7280]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
          Entrá al panel
        </Link>
      </p>
    </form>
  );
}
