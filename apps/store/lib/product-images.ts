export type ProductImageLike = { url: string; alt: string | null };

/** URLs vacías rompen next/image y el detalle si el carrusel asume ítem válido. */
export function filterRenderableProductImages<T extends ProductImageLike>(
  images: T[] | undefined | null,
): T[] {
  if (!images?.length) return [];
  return images.filter(
    (im) => typeof im.url === "string" && im.url.trim().length > 0,
  );
}
