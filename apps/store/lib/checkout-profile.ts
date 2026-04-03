const storageKey = (slug: string) => `vxlink:checkout:${slug}`;

export type SavedCheckoutProfile = {
  name: string;
  phone: string;
  email: string;
  delivery_type: "PICKUP" | "DELIVERY";
  notes: string;
};

export function loadCheckoutProfile(slug: string): SavedCheckoutProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<SavedCheckoutProfile>;
    if (typeof j.name !== "string" || typeof j.phone !== "string") return null;
    return {
      name: j.name,
      phone: j.phone,
      email: typeof j.email === "string" ? j.email : "",
      delivery_type: j.delivery_type === "DELIVERY" ? "DELIVERY" : "PICKUP",
      notes: typeof j.notes === "string" ? j.notes : "",
    };
  } catch {
    return null;
  }
}

export function saveCheckoutProfile(slug: string, profile: SavedCheckoutProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(profile));
  } catch {
    /* quota / private mode */
  }
}
