import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENC_PREFIX = 'enc:v1:';
const IV_LEN = 12; // 96 bits, recomendado para AES-GCM
const TAG_LEN = 16; // 128 bits

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada. Generala con: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error(
      'ENCRYPTION_KEY debe ser hex de 64 caracteres (32 bytes / 256 bits).',
    );
  }
  cachedKey = Buffer.from(raw, 'hex');
  return cachedKey;
}

/**
 * Cifra un secreto con AES-256-GCM. Devuelve un string con prefijo "enc:v1:"
 * que contiene `iv | ciphertext | authTag` en base64. Strings vacíos o nulos
 * se devuelven como null para que la columna quede NULL en BD.
 */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, enc, tag]).toString('base64');
}

/**
 * Descifra un valor que vino de `encryptSecret`. Si el valor no tiene el
 * prefijo (registros pre-cifrado o cargados manualmente), se devuelve tal cual
 * para mantener compatibilidad mientras se migran datos. Null/undefined → null.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  const blob = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  if (blob.length < IV_LEN + TAG_LEN) {
    throw new Error('Valor cifrado corrupto: tamaño insuficiente');
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(blob.length - TAG_LEN);
  const enc = blob.subarray(IV_LEN, blob.length - TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

/**
 * Devuelve true si el valor parece haber sido cifrado por este módulo.
 * Útil para diagnósticos y migraciones.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}
