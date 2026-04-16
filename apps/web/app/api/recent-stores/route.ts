import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy interno: el cliente siempre llama a /api/recent-stores (URL relativa,
 * nunca falla por CORS ni por variables de entorno en el browser).
 * El servidor usa NEXT_PUBLIC_API_URL para llegar a la API real.
 */
export async function GET() {
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1"
  ).replace(/\/+$/, "");

  try {
    const res = await fetch(`${apiBase}/public/recent-stores`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ data: [] });
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ data: [] });
  }
}
