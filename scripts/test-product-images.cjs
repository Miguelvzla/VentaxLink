/**
 * Contrato de filterRenderableProductImages (apps/store/lib/product-images.ts).
 * Ejecutar: npm run test:product-images
 */
function filterRenderableProductImages(images) {
  if (!images?.length) return [];
  return images.filter(
    (im) => typeof im.url === "string" && im.url.trim().length > 0,
  );
}

const assert = require("assert");

assert.deepStrictEqual(filterRenderableProductImages(undefined), []);
assert.deepStrictEqual(filterRenderableProductImages(null), []);
assert.deepStrictEqual(filterRenderableProductImages([]), []);
assert.deepStrictEqual(filterRenderableProductImages([{ url: "", alt: null }]), []);
assert.deepStrictEqual(filterRenderableProductImages([{ url: "  ", alt: null }]), []);
assert.strictEqual(
  filterRenderableProductImages([
    { url: "", alt: null },
    { url: "https://example.com/a.jpg", alt: "a" },
  ]).length,
  1,
);
assert.strictEqual(
  filterRenderableProductImages([{ url: "https://b.jpg", alt: null }])[0].url,
  "https://b.jpg",
);

console.log("test:product-images — ok");
