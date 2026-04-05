import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? "" : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Link href="/login" className="mb-4 block text-center font-semibold text-[#111827] hover:opacity-80">
          <span className="text-[#22C55E]">Venta</span>
          <span className="text-[#2563EB]">XLink</span>
        </Link>
        <h1 className="text-center text-lg font-semibold text-[#111827]">Nueva contraseña</h1>
        <p className="mt-1 text-center text-sm text-[#9CA3AF]">Elegí una contraseña nueva para tu panel.</p>
        <ResetPasswordForm initialToken={token} />
      </div>
    </div>
  );
}
