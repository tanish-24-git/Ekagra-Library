import { z } from "zod";

// Field rules shared by the browser and the server, so both agree on what's valid.

// Letters in any script (Marathi names included), spaces, dots, apostrophes, hyphens.
export const personName = z
  .string()
  .trim()
  .min(2, "Enter your name")
  .max(60, "Keep your name under 60 characters")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, "Use only letters in your name");

// Indian mobile: 10 digits starting 6 to 9. Accepts +91, 91 or 0 in front, and spaces.
export const indianMobile = z
  .string()
  .trim()
  .min(1, "Enter your mobile number")
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9"));

export const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => v || undefined);
