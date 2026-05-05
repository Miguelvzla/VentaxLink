import writeXlsxFile from "write-excel-file/browser";

type Cell = string | number | null | undefined;
type Row = Record<string, Cell>;

/**
 * Genera y descarga un .xlsx desde un array de objetos planos.
 * Cada celda se tipa según el valor (number o string), null/undefined queda vacía.
 * La firma cambió de sync a async: hay que `await downloadXlsx(...)` desde los callers.
 */
export async function downloadXlsx(
  filename: string,
  sheetName: string,
  rows: Row[],
): Promise<void> {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  const headerRow = headers.map((h) => ({
    value: h,
    fontWeight: "bold" as const,
  }));

  const dataRows = rows.map((row) =>
    headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined || v === "") {
        return null;
      }
      if (typeof v === "number" && Number.isFinite(v)) {
        return { type: Number, value: v };
      }
      return { type: String, value: String(v) };
    }),
  );

  const result = writeXlsxFile([headerRow, ...dataRows], {
    sheet: sheetName.slice(0, 31),
  });
  await result.toFile(filename);
}
