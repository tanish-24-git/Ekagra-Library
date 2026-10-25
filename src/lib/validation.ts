import { z } from "zod";
import { examTargetEnum, paymentModeEnum, seatingEnum } from "@/db/schema";
import { indianMobile, optionalText, personName } from "./fields";
import { aadhaarField, panField } from "./id-numbers";

const note = optionalText(1000, "Keep notes under 1000 characters");

// Everything the admin can set about a student. Adding also takes the first
// payment; editing changes the details and the current seat and fee.
const studentFields = z.object({
  fullName: personName,
  phone: indianMobile,
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional().transform((v) => v || undefined),
  examTarget: z.enum(examTargetEnum.enumValues),
  seating: z.enum(seatingEnum.enumValues),
  seatNumber: optionalText(10, "Desk numbers are at most 10 characters"),
  feeInr: z.coerce.number().int().min(0, "Fee can’t be negative"),
  emergencyName: optionalText(60, "Keep the name under 60 characters"),
  emergencyPhone: z.union([z.literal(""), indianMobile]).optional().transform((v) => v || undefined),
  notes: note,
  // Empty keeps what's saved (when editing) or saves nothing (when adding).
  aadhaar: aadhaarField,
  pan: panField,
});

const needsDesk = { path: ["seatNumber"], message: "Enter the desk number for a reserved desk" };

export const createStudentSchema = studentFields
  .extend({
    months: z.coerce.number().int().min(1).max(12).default(1),
    paymentMode: z.enum(paymentModeEnum.enumValues).default("cash"),
  })
  .refine((v) => v.seating === "open" || v.seatNumber, needsDesk);

export const editStudentSchema = studentFields.refine((v) => v.seating === "open" || v.seatNumber, needsDesk);
export type EditStudentInput = z.infer<typeof editStudentSchema>;

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// Renewing: how many months were paid for, how much, and how.
export const renewSchema = z.object({
  months: z.coerce.number().int().min(1, "At least 1 month").max(12, "At most 12 months"),
  amountInr: z.coerce.number().int().min(0, "Amount can’t be negative"),
  mode: z.enum(paymentModeEnum.enumValues),
});
export type RenewInput = z.infer<typeof renewSchema>;
