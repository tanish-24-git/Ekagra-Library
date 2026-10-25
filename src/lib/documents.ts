import type { DocumentKind } from "@/db/schema";

// The ID documents the library collects when a student joins.
export const DOCUMENT_KINDS: DocumentKind[] = ["aadhaar", "pan", "driving_licence"];

export const documentLabels: Record<DocumentKind, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  driving_licence: "Driving licence",
};

export const DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
