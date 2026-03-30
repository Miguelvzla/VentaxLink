export type CartLine = {
  product_slug: string;
  name: string;
  price: string;
  quantity: number;
  stock: number;
  track_stock: boolean;
};

function key(slug: string) {
  return `ventaxlink_cart_${slug}`;
}

function dispatchCartUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ventaxlink-cart"));
  }
}

export function getCart(slug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(slug: string, lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(slug), JSON.stringify(lines));
  dispatchCartUpdate();
}

export function cartItemCount(slug: string): number {
  return getCart(slug).reduce((s, l) => s + l.quantity, 0);
}

export function addToCart(
  slug: string,
  line: Omit<CartLine, "quantity"> & { quantity?: number },
): { ok: boolean; message?: string } {
  const qtyAdd = line.quantity ?? 1;
  if (qtyAdd < 1) return { ok: false, message: "Cantidad inválida" };
  if (line.track_stock && line.stock <= 0) {
    return { ok: false, message: "Sin stock" };
  }
  const cart = getCart(slug);
  const idx = cart.findIndex((c) => c.product_slug === line.product_slug);
  const current = idx >= 0 ? cart[idx].quantity : 0;
  const nextQty = current + qtyAdd;
  if (line.track_stock && nextQty > line.stock) {
    return { ok: false, message: "No hay stock suficiente" };
  }
  const next = [...cart];
  const merged: CartLine = {
    product_slug: line.product_slug,
    name: line.name,
    price: line.price,
    stock: line.stock,
    track_stock: line.track_stock,
    quantity: nextQty,
  };
  if (idx >= 0) next[idx] = merged;
  else next.push(merged);
  setCart(slug, next);
  return { ok: true };
}

export function updateLineQuantity(slug: string, productSlug: string, quantity: number) {
  const cart = getCart(slug);
  const line = cart.find((c) => c.product_slug === productSlug);
  if (!line) return;
  if (quantity <= 0) {
    setCart(
      slug,
      cart.filter((c) => c.product_slug !== productSlug),
    );
    return;
  }
  if (line.track_stock && quantity > line.stock) return;
  setCart(
    slug,
    cart.map((c) => (c.product_slug === productSlug ? { ...c, quantity } : c)),
  );
}

export function removeLine(slug: string, productSlug: string) {
  setCart(
    slug,
    getCart(slug).filter((c) => c.product_slug !== productSlug),
  );
}
