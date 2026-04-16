-- Agrega unidad de medida al producto (unidad, kg, gr, lt, ml, etc.)
-- Default 'unidad' para que los productos existentes no cambien su comportamiento.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'unidad';
