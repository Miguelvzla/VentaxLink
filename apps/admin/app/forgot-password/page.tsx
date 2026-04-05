import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

const webHomeUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Link href="/login" className="mb-4 block text-center font-semibold text-[#111827] hover:opacity-80">
          <span className="text-[#22C55E]">Venta</span>
          <span className="text-[#2563EB]">XLink</span>
        </Link>
        <h1 className="text-center text-lg font-semibold text-[#111827]">Olvidé mi contraseña</h1>
        <p className="mt-1 text-center text-sm text-[#9CA3AF]">
          Autogestión: te enviamos un enlace al mail del comercio para elegir una clave nueva (requiere Resend en el
          servidor). Si no recibís el correo, contactá a soporte VentaXLink.
        </p>
        <ForgotPasswordForm />
        <a
          href={webHomeUrl.replace(/\/$/, "")}
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition-colors hover:border-[#22C55E]/40 hover:bg-[#F9FAFB]"
        >
          ← Ir al inicio (sitio web)
        </a>
      </div>
    </div>
  );
}
