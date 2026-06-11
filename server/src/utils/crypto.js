import crypto from 'crypto';
import { getAppEncryptionKey, getLegacyEncryptionSecrets } from '../config/secrets.js';

const buildEncryptionKey = (secret) => crypto
  .createHash('sha256')
  .update(secret)
  .digest();

const decryptWithSecret = (value, secret) => {
  const [ivBase64, authTagBase64, encryptedBase64] = value.split(':');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Encrypted payload is invalid');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    buildEncryptionKey(secret),
    Buffer.from(ivBase64, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

export const encryptText = (value) => {
  if (!value) return null;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', buildEncryptionKey(getAppEncryptionKey()), iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

export const decryptText = (value) => {
  if (!value) return null;

  const secretsToTry = [getAppEncryptionKey(), ...getLegacyEncryptionSecrets()];
  let lastError;

  for (const secret of secretsToTry) {
    try {
      return decryptWithSecret(value, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Encrypted payload is invalid');
};
