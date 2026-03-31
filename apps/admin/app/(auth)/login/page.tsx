import { LoginForm } from "@/components/LoginForm";

const webHomeUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <a
          href={webHomeUrl.replace(/\/$/, "")}
          className="mb-4 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition-colors hover:border-[#22C55E]/40 hover:bg-[#F9FAFB]"
        >
          ← Ir al inicio (sitio web)
        </a>
        <h1 className="text-center font-semibold text-[#111827]">
          <span className="text-[#22C55E]">Venta</span>
          <span className="text-[#2563EB]">XLink</span>
        </h1>
        <p className="mt-1 text-center text-sm text-[#9CA3AF]">Panel de tu comercio</p>
        <p className="mt-2 text-center text-xs leading-relaxed text-[#9CA3AF]">
          Entrá con el mail y la clave del usuario de <strong className="font-medium text-[#6B7280]">tu negocio</strong>{" "}
          (el que creaste al registrar la tienda).
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
