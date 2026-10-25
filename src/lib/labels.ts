import type { ExamTarget, PaymentMode, Seating } from "@/db/schema";

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

export const paymentModeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatInr = (amount: number) => inr.format(amount);

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
export const formatShortDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00`));

const fullDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const formatDate = (isoDate: string) => fullDate.format(new Date(`${isoDate}T00:00:00`));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// How long someone has been a member: "1 year 2 months", "3 months", "12 days".
export function formatTenure(joinedOn: string, today: string) {
  const [y1, m1, d1] = joinedOn.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (months < 1) {
    const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(joinedOn)) / 86_400_000));
    return days === 0 ? "Joined today" : plural(days, "day");
  }
  const years = Math.floor(months / 12);
  months -= years * 12;
  return [years && plural(years, "year"), months && plural(months, "month")].filter(Boolean).join(" ");
}
