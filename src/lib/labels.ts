import type { ExamTarget, Seating } from "@/db/schema";

export const seatingLabels: Record<Seating, string> = {
  reserved: "Reserved desk",
  open: "Sits anywhere",
};

export const examLabels: Record<ExamTarget, string> = {
  mpsc_rajyaseva: "MPSC Rajyaseva",
  mpsc_combined: "MPSC Combined",
  upsc_cse: "UPSC CSE",
  neet: "NEET",
  jee: "JEE",
  banking: "Banking",
  ssc: "SSC",
  police_bharti: "Police Bharti",
  tet: "TET / TAIT",
  other: "Other",
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatInr = (amount: number) => inr.format(amount);

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
export const formatShortDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00`));
