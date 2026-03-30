/** `https://wa.me/...` abre WhatsApp Web en el navegador o la app si está instalada. */
export function whatsappMeUrlFromPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  let n = d;
  if (!n.startsWith("54") && n.length >= 8 && n.length <= 11) {
    n = `54${n}`;
  }
  if (n.length < 10) return null;
  return `https://wa.me/${n}`;
}
