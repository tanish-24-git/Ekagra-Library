import { z } from "zod";
import { indianMobile, optionalText, personName } from "./fields";

// The public enquiry form. Used in the browser for instant checks and in
// /api/enquiries for the real validation.
export const enquirySchema = z.object({
  name: personName,
  phone: indianMobile,
  preparingFor: optionalText(120, "Keep this under 120 characters"),
  reason: optionalText(500, "Keep this under 500 characters"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryField = keyof EnquiryInput;
