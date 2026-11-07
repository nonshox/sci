import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function key() {
  const raw = process.env.SCI_SECRET_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error('SCI_SECRET_KEY must be 64 hex characters (32 random bytes).');
  return Buffer.from(raw, 'hex');
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function decryptSecret(value: string) {
  const [iv, tag, data] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
