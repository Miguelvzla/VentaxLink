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
 * Returns black or white text color that gives best contrast
 * against the given background hex color.
 */
export function contrastText(bgHex: string): string {
  try {
    return hexLuminance(bgHex) > 0.179 ? "#111827" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

/**
 * If `hex` is too light to read against a white background,
 * returns a safe dark fallback color.
 * Used for price text displayed on white cards.
 */
export function readableOnWhite(hex: string, fallback = "#111827"): string {
  try {
    return hexLuminance(hex) > 0.5 ? fallback : hex;
  } catch {
    return fallback;
  }
}
