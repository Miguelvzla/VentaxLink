"use client";

import { useEffect } from "react";
import { trackStoreEvent } from "@/lib/track";

export function ProductViewTracker({
  slug,
  productSlug,
  enabled = true,
}: {
  slug: string;
  productSlug: string;
  /** Solo Pro / Mayorista: el plan Inicio no registra vistas por producto. */
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    trackStoreEvent(slug, "producto_vista", { product_slug: productSlug });
  }, [slug, productSlug, enabled]);
  return null;
}
