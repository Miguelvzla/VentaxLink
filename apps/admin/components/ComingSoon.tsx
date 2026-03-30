export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Próximamente</p>
      <h1 className="mt-2 text-xl font-bold text-[#111827]">{title}</h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        {description ??
          "Todavía no está desarrollado en esta versión. Podés usar Productos y ver tu tienda pública con el link de tu comercio."}
      </p>
    </div>
  );
}
