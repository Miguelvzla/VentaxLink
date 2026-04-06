"use client";

type Props = {
  slug: string;
  /** Color del botón / foco */
  primaryColor: string;
  /** Valor inicial (página catálogo con ?q=) */
  defaultQuery?: string;
  /** Mantener filtros al enviar búsqueda (GET) */
  preserveFeatured?: boolean;
  preserveNewOnly?: boolean;
  /** id del form para asociar label en accesibilidad */
  id?: string;
};

/**
 * Búsqueda GET hacia /tienda/[slug]/productos?q=… (funciona sin JS).
 */
export function StoreCatalogSearch({
  slug,
  primaryColor,
  defaultQuery = "",
  preserveFeatured = false,
  preserveNewOnly = false,
  id = "store-catalog-search",
}: Props) {
  const action = `/tienda/${slug}/productos`;

  return (
    <form action={action} method="get" className="flex w-full max-w-xl gap-2">
      {preserveFeatured ? <input type="hidden" name="featured" value="1" /> : null}
      {preserveNewOnly ? <input type="hidden" name="new_only" value="1" /> : null}
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        placeholder="Buscar productos…"
        defaultValue={defaultQuery}
        autoComplete="off"
        maxLength={120}
        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        style={{ backgroundColor: primaryColor }}
      >
        Buscar
      </button>
    </form>
  );
}
