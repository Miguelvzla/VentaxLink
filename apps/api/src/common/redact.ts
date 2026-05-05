/**
 * Enmascara un email para logs: deja las dos primeras letras del local-part
 * y el dominio completo. Útil para troubleshooting sin exponer PII.
 *
 *   redactEmail('juan.perez@gmail.com')  -> 'ju…@gmail.com'
 *   redactEmail('a@gmail.com')           -> '*@gmail.com'
 *   redactEmail('sin-arroba')            -> '***'
 */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.length <= 2 ? '*' : `${local.slice(0, 2)}…`;
  return `${head}@${domain}`;
}
