import type { DocumentKind } from "@/db/schema";

// The ID documents the library collects when a student joins.
export const DOCUMENT_KINDS: DocumentKind[] = ["aadhaar", "pan", "driving_licence"];

export const documentLabels: Record<DocumentKind, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  driving_licence: "Driving licence",
};

export const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// The first bytes of each allowed file type. The browser's declared type is
// only a claim; the content has to match it.
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x),
  "image/webp": (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  "application/pdf": (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-",
};
export const matchesType = (type: string, bytes: Uint8Array) => !!SIGNATURES[type]?.(bytes);
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
