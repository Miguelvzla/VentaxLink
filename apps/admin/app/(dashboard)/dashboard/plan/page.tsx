import { PlanUpgradeClient } from "@/components/PlanUpgradeClient";

type PlanChoice = "STARTER" | "PRO" | "WHOLESALE";

function parsePlan(raw: string | string[] | undefined): PlanChoice | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "STARTER" || v === "PRO" || v === "WHOLESALE") return v;
  return undefined;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialDesired = parsePlan(sp.plan);
  return <PlanUpgradeClient initialDesired={initialDesired} />;
}
