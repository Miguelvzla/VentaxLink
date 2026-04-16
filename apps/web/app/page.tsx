import { LandingView } from "@/components/landing/LandingView";
import type { RecentStore } from "@/components/landing/StoreCarousel";

async function fetchRecentStores(): Promise<RecentStore[]> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    "https://api.ventaxlink.ar/v1"
  ).replace(/\/+$/, "");

  try {
    const res = await fetch(`${apiBase}/public/recent-stores`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: RecentStore[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const recentStores = await fetchRecentStores();
  return <LandingView recentStores={recentStores} />;
}
