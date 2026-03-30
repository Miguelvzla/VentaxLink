import { storeApiBase } from "./api";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  const k = "ventaxlink_sid";
  let s = sessionStorage.getItem(k);
  if (!s) {
    s =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}`;
    sessionStorage.setItem(k, s);
  }
  return s;
}

export function trackStoreEvent(
  slug: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  void fetch(`${storeApiBase()}/store/${slug}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      properties: properties ?? {},
      session_id: sessionId(),
    }),
  }).catch(() => {});
}
