import Link from "next/link";
import { headers } from "next/headers";
import { RegisterForm } from "@/components/RegisterForm";
import { resolveStorePublicBase } from "@/lib/store-public-url";

type PlanChoice = "STARTER" | "PRO" | "WHOLESALE";

function parsePlan(raw: string | string[] | undefined): PlanChoice | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "STARTER" || v === "PRO" || v === "WHOLESALE") return v;
  return undefined;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialPlan = parsePlan(sp.plan);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const storePublicBase = resolveStorePublicBase(host);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Link href="/login" className="block text-center font-semibold text-[#111827] hover:opacity-80">
          <span className="text-[#22C55E]">Venta</span>
          <span className="text-[#2563EB]">XLink</span>
        </Link>
        <p className="mt-1 text-center text-sm text-[#9CA3AF]">Creá tu tienda en minutos</p>
        <RegisterForm initialPlan={initialPlan} storePublicBase={storePublicBase} />
      </div>
    </div>
  );
}
