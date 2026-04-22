/** Relative luminance per WCAG 2.1 (0 = black, 1 = white) */
function hexLuminance(hex: string): number {
  const c = hex.replace(/^#/, "").padEnd(6, "0");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Price text is displayed on a WHITE card background.
 * Only replace the brand color with a dark fallback when the color is so light
 * it would be nearly invisible on white (luminance > 0.7 ≈ very light / near-white).
 * Readable colors (greens, blues, dark reds, etc.) are kept as-is.
 */
export function readableOnWhite(hex: string, fallback = "#111827"): string {
  try {
    return hexLuminance(hex) > 0.7 ? fallback : hex;
  } catch {
    return fallback;
  }
}

/**
 * Badge text color: always white (original brand behavior).
 * Only switch to dark when the badge background is near-white
 * (luminance > 0.85) so the text doesn't become invisible.
 */
export function badgeTextOnColor(bgHex: string): string {
  try {
    return hexLuminance(bgHex) > 0.85 ? "#374151" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}
