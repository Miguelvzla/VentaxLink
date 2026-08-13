"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef, useState } from "react";
import {
  postBulkPriceUpdate,
  type AdminProduct,
  type BulkPriceMarkupType,
  type BulkPriceResult,
  type BulkPriceRounding,
} from "@/lib/api";
import { downloadXlsx } from "@/lib/exportExcel";
import { parsePriceSheet, type PriceSheetRow } from "@/lib/parsePriceSheet";

const ars = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

type Props = {
  token: string;
  products: AdminProduct[];
  /** Se llama después de aplicar para que la lista de productos se recargue. */
  onApplied: () => void | Promise<void>;
};

export function BulkPriceUpdate({ token, products, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [markupType, setMarkupType] = useState<BulkPriceMarkupType>("PERCENT");
  const [markupValue, setMarkupValue] = useState("");
  const [rounding, setRounding] = useState<BulkPriceRounding>("NEAREST_100");

  const [rows, setRows] = useState<PriceSheetRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [skippedRows, setSkippedRows] = useState(0);
  const [preview, setPreview] = useState<BulkPriceResult | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const markupNumber = Number(markupValue.replace(",", "."));
  const markupValid = Number.isFinite(markupNumber) && markupNumber >= 0;

  function resetSheet() {
    setRows([]);
    setFileName("");
    setSkippedRows(0);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Baja la planilla con los nombres exactos de la tienda: así el match después es fiable. */
  async function onDownloadTemplate() {
    setError(null);
    if (products.length === 0) {
      setError("Todavía no tenés productos cargados.");
      return;
    }
    try {
      await downloadXlsx("modelo-precios.xlsx", "Precios", [
        ...products.map((p) => ({ nombre: p.name, precio: Number(p.price) })),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la planilla");
    }
  }

  async function onPickFile(file: File | null) {
    setError(null);
    setDone(null);
    setPreview(null);
    if (!file) {
      resetSheet();
      return;
    }
    setBusy(true);
    try {
      const parsed = await parsePriceSheet(file);
      if (parsed.rows.length === 0) {
        resetSheet();
        setError(
          "No se encontraron filas válidas. La planilla necesita una columna «nombre» y una «precio».",
        );
        return;
      }
      setRows(parsed.rows);
      setFileName(file.name);
      setSkippedRows(parsed.skipped);
    } catch (e) {
      resetSheet();
      setError(
        e instanceof Error
          ? `No se pudo leer el archivo: ${e.message}`
          : "No se pudo leer el archivo",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    if (!markupValid || rows.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await postBulkPriceUpdate(token, {
        dry_run: true,
        markup_type: markupType,
        markup_value: markupNumber,
        rounding,
        items: rows,
      });
      setPreview(res);
      if (res.matched_count === 0) {
        setError(
          "Ninguno de los nombres de la planilla coincide con tus productos. Bajá la planilla modelo y trabajá sobre esos nombres.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo calcular la vista previa");
    } finally {
      setBusy(false);
    }
  }

  async function applyChanges() {
    if (!preview || preview.matched_count === 0) return;
    if (
      !window.confirm(
        `Se van a actualizar los precios de ${preview.matched_count} producto(s). Esta acción no se puede deshacer. ¿Continuar?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await postBulkPriceUpdate(token, {
        dry_run: false,
        markup_type: markupType,
        markup_value: markupNumber,
        rounding,
        items: rows,
      });
      setDone(`Listo: se actualizaron ${res.matched_count} producto(s).`);
      resetSheet();
      await onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron aplicar los precios");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-left hover:bg-gray-50"
      >
        <span>
          <span className="text-sm font-semibold text-[#374151]">
            Actualizar precios desde planilla
          </span>
          <span className="mt-0.5 block text-xs text-[#6B7280]">
            Subí la lista de tu proveedor y aplicá tu ganancia a todos los productos de una vez
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-100 px-5 pb-5 pt-4">
          {/* Paso 1 */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">1. Bajá la planilla modelo</h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Viene con los nombres de tus productos y su precio actual. Pasale ese archivo junto
              con la lista de tu proveedor a una IA y pedile que complete la columna{" "}
              <strong>precio</strong> con el costo nuevo, sin cambiar los nombres.
            </p>
            <button
              type="button"
              onClick={() => void onDownloadTemplate()}
              className="mt-2 rounded-xl border border-[#2563EB] px-4 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              Descargar planilla modelo
            </button>
          </div>

          {/* Paso 2 */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">2. Definí tu ganancia</h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              El precio de la planilla es el costo del proveedor. Tu ganancia se le suma para
              calcular el precio de venta.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={markupType}
                onChange={(e) => {
                  setMarkupType(e.target.value as BulkPriceMarkupType);
                  setPreview(null);
                }}
                className="rounded-xl border border-[#D1D5DB] px-3 py-2 text-sm"
              >
                <option value="PERCENT">Porcentaje (%)</option>
                <option value="AMOUNT">Monto fijo ($)</option>
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={markupValue}
                onChange={(e) => {
                  setMarkupValue(e.target.value);
                  setPreview(null);
                }}
                placeholder={markupType === "PERCENT" ? "10" : "10000"}
                className="w-32 rounded-xl border border-[#D1D5DB] px-3 py-2 text-sm"
              />
              <select
                value={rounding}
                onChange={(e) => {
                  setRounding(e.target.value as BulkPriceRounding);
                  setPreview(null);
                }}
                className="rounded-xl border border-[#D1D5DB] px-3 py-2 text-sm"
              >
                <option value="NEAREST_100">Redondear a $100</option>
                <option value="NEAREST_1000">Redondear a $1.000</option>
                <option value="NONE">Sin redondeo</option>
              </select>
            </div>
            {markupValue !== "" && !markupValid && (
              <p className="mt-1 text-xs text-[#B91C1C]">Ingresá un número válido.</p>
            )}
          </div>

          {/* Paso 3 */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">3. Subí la planilla completada</h3>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-[#374151] file:mr-3 file:rounded-xl file:border-0 file:bg-[#F3F4F6] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#374151]"
            />
            {fileName && (
              <p className="mt-1 text-xs text-[#6B7280]">
                <strong>{fileName}</strong>: {rows.length} fila(s) leída(s)
                {skippedRows > 0 && ` · ${skippedRows} descartada(s) por estar incompletas`}
              </p>
            )}
            <button
              type="button"
              disabled={busy || rows.length === 0 || !markupValid || markupValue === ""}
              onClick={() => void runPreview()}
              className="mt-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Procesando…" : "Ver vista previa"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {done && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {done}
            </div>
          )}

          {/* Paso 4: confirmación */}
          {preview && preview.matched_count > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">
                4. Revisá y confirmá
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                Coinciden <strong>{preview.matched_count}</strong> producto(s).
                {preview.unmatched_count > 0 && (
                  <>
                    {" "}
                    <strong>{preview.unmatched_count}</strong> fila(s) de la planilla no coinciden
                    con ningún producto y no se van a tocar.
                  </>
                )}
              </p>

              <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-[#E5E7EB]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Producto</th>
                      <th className="px-3 py-2 text-right font-semibold">Actual</th>
                      <th className="px-3 py-2 text-right font-semibold">Costo</th>
                      <th className="px-3 py-2 text-right font-semibold">Nuevo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it) => {
                      const up = it.new_price > it.current_price;
                      const same = it.new_price === it.current_price;
                      return (
                        <tr key={it.product_id} className="border-t border-[#F3F4F6]">
                          <td className="px-3 py-2 text-[#111827]">{it.name}</td>
                          <td className="px-3 py-2 text-right text-[#6B7280]">
                            ${ars(it.current_price)}
                          </td>
                          <td className="px-3 py-2 text-right text-[#6B7280]">${ars(it.cost)}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              same
                                ? "text-[#6B7280]"
                                : up
                                  ? "text-[#B91C1C]"
                                  : "text-[#15803D]"
                            }`}
                          >
                            ${ars(it.new_price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void applyChanges()}
                className="mt-3 rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Aplicando…" : `Aplicar a ${preview.matched_count} producto(s)`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
