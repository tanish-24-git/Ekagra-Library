import { z } from "zod";

// Aadhaar and PAN numbers: formatting while typing, and validation shared by
// the admin form (browser) and the server action.

// Verhoeff checksum, which the last Aadhaar digit is built from. Catches
// any single wrong digit and most swapped pairs.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const verhoeff = (digits: string) =>
  [...digits].reverse().reduce((c, ch, i) => D[c][P[i % 8][Number(ch)]], 0) === 0;

export const aadhaarDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, 12);
export const formatAadhaar = (raw: string) => aadhaarDigits(raw).replace(/(\d{4})(?=\d)/g, "$1 ");
export const normalizePan = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

// 5 letters (the 4th is the holder type, P for a person), 4 digits, 1 letter.
const PAN = /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/;

export function aadhaarError(raw: string): string | undefined {
  const d = aadhaarDigits(raw);
  if (!d) return undefined;
  if (d.length < 12) return "Aadhaar numbers have 12 digits";
  if (/^[01]/.test(d)) return "Aadhaar numbers don’t start with 0 or 1";
  if (!verhoeff(d)) return "This Aadhaar number has a typo. Check the digits again";
  return undefined;
}

export function panError(raw: string): string | undefined {
  const p = normalizePan(raw);
  if (!p) return undefined;
  if (p.length < 10) return "PAN has 10 characters, like ABCDE1234F";
  if (!PAN.test(p)) return "PAN looks like ABCDE1234F: 5 letters, 4 digits, 1 letter";
  return undefined;
}

// Optional form fields: empty becomes undefined, otherwise a clean value.
export const aadhaarField = z
  .string()
  .optional()
  .transform((v) => aadhaarDigits(v ?? ""))
  .superRefine((v, ctx) => {
    const message = aadhaarError(v);
    if (message) ctx.addIssue({ code: "custom", message });
  })
  .transform((v) => v || undefined);

export const panField = z
  .string()
  .optional()
  .transform((v) => normalizePan(v ?? ""))
  .superRefine((v, ctx) => {
    const message = panError(v);
    if (message) ctx.addIssue({ code: "custom", message });
  })
  .transform((v) => v || undefined);

export const maskAadhaar = (last4: string) => `XXXX XXXX ${last4}`;
export const maskPan = (last4: string) => `XXXXXX${last4}`;
