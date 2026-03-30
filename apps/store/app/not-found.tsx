import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-display text-2xl font-bold text-[#111827]">No encontrado</h1>
      <p className="text-center text-sm text-[#6B7280]">La tienda o el producto no existe, o la API no está disponible.</p>
      <Link href="/" className="text-sm font-semibold text-[#2563EB] hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
