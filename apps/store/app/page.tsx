import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F9FAFB] px-4">
      <h1 className="font-display text-2xl font-bold text-[#111827]">VentaXLink — Tienda</h1>
      <p className="max-w-md text-center text-sm text-[#6B7280]">
        Las tiendas viven en <code className="rounded bg-gray-200 px-1">/tienda/[slug]</code>. Probá con un comercio
        registrado en la base o usá el seed <strong>demo</strong>.
      </p>
      <Link
        href="/tienda/demo"
        className="rounded-xl bg-[#22C55E] px-6 py-3 font-semibold text-white hover:bg-[#15803D]"
      >
        Ver tienda demo
      </Link>
    </div>
  );
}
