export type PriceSheetRow = { name: string; cost: number };

export type PriceSheetParseResult = {
  rows: PriceSheetRow[];
  /** Filas descartadas por nombre vacío o precio ilegible. */
  skipped: number;
};

/**
 * Convierte un precio escrito por una persona (o por una IA) a número.
 *
 * El caso peligroso es el formato argentino: `$24.400` son veinticuatro mil
 * cuatrocientos, no 24,4. Si esto se parsea mal el precio de venta queda mil
 * veces más barato, así que la heurística decide el separador decimal mirando
 * cuál aparece último y cuántos dígitos lo siguen.
 */
export function parseArsPrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, "");
  if (!cleaned || cleaned === "-") return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  /** "" significa que ambos separadores son de miles. */
  let decimalSep: "." | "," | "" = "";
  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastComma >= 0) {
    decimalSep = /^-?\d{1,3}(,\d{3})+$/.test(cleaned) ? "" : ",";
  } else if (lastDot >= 0) {
    decimalSep = /^-?\d{1,3}(\.\d{3})+$/.test(cleaned) ? "" : ".";
  }

  let intPart: string;
  let fracPart = "";
  if (decimalSep) {
    const idx = decimalSep === "." ? lastDot : lastComma;
    intPart = cleaned.slice(0, idx).replace(/[.,]/g, "");
    fracPart = cleaned.slice(idx + 1).replace(/[.,]/g, "");
  } else {
    intPart = cleaned.replace(/[.,]/g, "");
  }

  const n = Number(`${intPart || "0"}.${fracPart || "0"}`);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function toCellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return "";
  return String(v).trim();
}

/** Un valor numérico de celda ya viene bien tipado; el texto pasa por la heurística. */
function toCost(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return Math.round(v * 100) / 100;
  }
  const s = toCellText(v);
  return s ? parseArsPrice(s) : null;
}

/**
 * Ubica las columnas por encabezado (`nombre` / `precio`). Si no los encuentra,
 * asume que la planilla no tiene encabezado y usa las dos primeras columnas.
 */
function resolveColumns(firstRow: unknown[]): {
  nameIdx: number;
  costIdx: number;
  hasHeader: boolean;
} {
  const headers = firstRow.map((c) =>
    toCellText(c)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );
  const nameIdx = headers.findIndex((h) => h === "nombre" || h === "producto");
  const costIdx = headers.findIndex(
    (h) => h === "precio" || h === "costo" || h === "precio proveedor",
  );
  if (nameIdx >= 0 && costIdx >= 0) {
    return { nameIdx, costIdx, hasHeader: true };
  }
  return { nameIdx: 0, costIdx: 1, hasHeader: false };
}

function rowsFromMatrix(matrix: unknown[][]): PriceSheetParseResult {
  const nonEmpty = matrix.filter((r) =>
    r.some((c) => toCellText(c) !== ""),
  );
  if (nonEmpty.length === 0) return { rows: [], skipped: 0 };

  const { nameIdx, costIdx, hasHeader } = resolveColumns(nonEmpty[0]);
  const body = hasHeader ? nonEmpty.slice(1) : nonEmpty;

  const rows: PriceSheetRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const name = toCellText(r[nameIdx]).slice(0, 200);
    const cost = toCost(r[costIdx]);
    if (!name || cost === null) {
      skipped += 1;
      continue;
    }
    rows.push({ name, cost });
  }
  return { rows, skipped };
}

/** Split de CSV que respeta comillas dobles y escapado `""`. */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): PriceSheetParseResult {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], skipped: 0 };

  /** Excel en español guarda con `;`. Se elige el separador más frecuente. */
  const semis = (lines[0].match(/;/g) ?? []).length;
  const commas = (lines[0].match(/,/g) ?? []).length;
  const tabs = (lines[0].match(/\t/g) ?? []).length;
  const sep = tabs > semis && tabs > commas ? "\t" : semis >= commas ? ";" : ",";

  return rowsFromMatrix(lines.map((l) => splitCsvLine(l, sep)));
}

/**
 * Lee la planilla de precios que sube el comercio.
 * Acepta .xlsx y .csv (la IA suele devolver CSV más confiable que Excel).
 *
 * El lector de xlsx se importa on-demand: pesa ~45 kB y la mayoría de las
 * visitas a la página de productos no usan esta función.
 */
export async function parsePriceSheet(
  file: File,
): Promise<PriceSheetParseResult> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  if (isCsv) {
    return parseCsv(await file.text());
  }
  const { default: readXlsxFile } = await import("read-excel-file");
  const matrix = (await readXlsxFile(file)) as unknown[][];
  return rowsFromMatrix(matrix);
}
