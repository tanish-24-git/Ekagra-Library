import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM for ID numbers and ID documents. The key comes from
// DOCUMENTS_KEY (64 hex characters). Losing the key makes stored documents
// unreadable, so keep a copy of it somewhere safe.

function key(): Buffer {
  const raw = process.env.DOCUMENTS_KEY;
  if (raw) {
    const k = Buffer.from(raw, "hex");
    if (k.length !== 32) throw new Error("DOCUMENTS_KEY must be 64 hex characters (32 bytes).");
    return k;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Set DOCUMENTS_KEY before storing ID documents.");
  // Development only, so the admin works before the key is set.
  return createHash("sha256").update("ekagra-library-development-key").digest();
}

// Layout: 12-byte IV, 16-byte auth tag, then the ciphertext.
export function seal(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function open(sealed: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key(), sealed.subarray(0, 12));
  decipher.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}

export const sealText = (text: string) => seal(Buffer.from(text, "utf8")).toString("base64");
export const openText = (sealed: string) => open(Buffer.from(sealed, "base64")).toString("utf8");
