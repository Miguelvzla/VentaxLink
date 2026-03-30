import { storeApiBase } from "./api";

export type CheckoutPayload = {
  items: { product_slug: string; quantity: number }[];
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_type?: "PICKUP" | "DELIVERY";
  customer_notes?: string;
  coupon_code?: string;
  use_points_redeem?: boolean;
};

function parseError(json: unknown, status: number): string {
  if (json && typeof json === "object" && "message" in json) {
    const m = (json as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.join(". ");
  }
  return `Error ${status}`;
}

export async function postCheckout(slug: string, payload: CheckoutPayload) {
  const res = await fetch(`${storeApiBase()}/store/${slug}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* noop */
  }
  if (!res.ok) throw new Error(parseError(json, res.status));
  return json as {
    data: {
      order_id: string;
      order_number: number;
      subtotal: string;
      discount_amount: string;
      total: string;
      message: string;
    };
  };
}
