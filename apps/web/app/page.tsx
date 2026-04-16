import { LandingView } from "@/components/landing/LandingView";
import type { RecentStore } from "@/components/landing/StoreCarousel";

async function fetchRecentStores(): Promise<RecentStore[]> {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    "https://api.ventaxlink.ar/v1"
  ).replace(/\/+$/, "");

  const url = `${apiBase}/public/recent-stores`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn("[LandingPage] recent-stores fetch not ok:", res.status, url);
      return [];
    }
    const json = (await res.json()) as { data: RecentStore[] };
    return json.data ?? [];
  } catch (e) {
    console.warn("[LandingPage] recent-stores fetch failed:", url, e);
    return [];
  }
}

export default async function LandingPage() {
  const recentStores = await fetchRecentStores();
  return <LandingView recentStores={recentStores} />;
}
