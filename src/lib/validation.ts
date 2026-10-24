import { z } from "zod";
import { examTargetEnum, seatingEnum } from "@/db/schema";

const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the student’s full name"),
    phone: indianMobile,
    email: z.union([z.literal(""), z.email("Enter a valid email")]).optional().transform((v) => v || undefined),
    examTarget: z.enum(examTargetEnum.enumValues),
    seating: z.enum(seatingEnum.enumValues),
    seatNumber: optionalText,
    months: z.coerce.number().int().min(1).max(12).default(1),
    feeInr: z.coerce.number().int().min(0, "Fee can’t be negative"),
    emergencyName: optionalText,
    emergencyPhone: z.union([z.literal(""), indianMobile]).optional().transform((v) => v || undefined),
    notes: optionalText,
  })
  .refine((v) => v.seating === "open" || v.seatNumber, {
    path: ["seatNumber"],
    message: "Enter the desk number for a reserved desk",
  });

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: indianMobile.optional(),
  status: z.enum(["active", "expired", "left"]).optional(),
  notes: optionalText,
});

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: indianMobile,
  examTarget: z.enum(examTargetEnum.enumValues).optional(),
  seatPreference: z.enum(seatingEnum.enumValues).optional(),
  message: z.string().trim().max(500, "Keep the message under 500 characters").optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
