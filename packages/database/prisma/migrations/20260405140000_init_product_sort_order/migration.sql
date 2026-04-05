-- Orden inicial alineado con la tienda: destacados primero, luego más nuevo arriba.
-- Así las posiciones editables (1, 2, 8…) no quedan mezcladas con valores 0 genéricos.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id
           ORDER BY is_featured DESC, created_at DESC
         ) AS rn
  FROM "Product"
)
UPDATE "Product" AS p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;
