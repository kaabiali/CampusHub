import { randomBytes, createHash } from 'node:crypto';

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createEmailToken(ttlMs) {
  const token = randomBytes(32).toString('base64url');
  return { token, stored: { hash: hashToken(token), expire: new Date(Date.now() + ttlMs) } };
}
