import { z } from "zod";
import { indianMobile, personName } from "./fields";

// The public enquiry form. Used in the browser for instant checks and in
// the submitEnquiry Server Action for the real validation. All four are
// required: they tell the owner who's asking and where students come from.
export const enquirySchema = z.object({
  name: personName,
  phone: indianMobile,
  location: z.string().trim().min(2, "Enter your area, for example Dhanori").max(80, "Keep the area under 80 characters"),
  preparingFor: z.string().trim().min(1, "Choose what you’re preparing for").max(120, "Keep this under 120 characters"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryField = keyof EnquiryInput;
