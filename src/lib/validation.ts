import { z } from "zod";
import { examTargetEnum, seatingEnum } from "@/db/schema";
import { indianMobile, optionalText, personName } from "./fields";

const note = optionalText(1000, "Keep notes under 1000 characters");

export const createStudentSchema = z
  .object({
    fullName: personName,
    phone: indianMobile,
    email: z.union([z.literal(""), z.email("Enter a valid email")]).optional().transform((v) => v || undefined),
    examTarget: z.enum(examTargetEnum.enumValues),
    seating: z.enum(seatingEnum.enumValues),
    seatNumber: optionalText(10, "Desk numbers are at most 10 characters"),
    months: z.coerce.number().int().min(1).max(12).default(1),
    feeInr: z.coerce.number().int().min(0, "Fee can’t be negative"),
    emergencyName: optionalText(60, "Keep the name under 60 characters"),
    emergencyPhone: z.union([z.literal(""), indianMobile]).optional().transform((v) => v || undefined),
    notes: note,
  })
  .refine((v) => v.seating === "open" || v.seatNumber, {
    path: ["seatNumber"],
    message: "Enter the desk number for a reserved desk",
  });

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  fullName: personName.optional(),
  phone: indianMobile.optional(),
  status: z.enum(["active", "expired", "left"]).optional(),
  notes: note,
});
