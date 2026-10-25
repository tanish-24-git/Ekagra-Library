import { site } from "@/content/site";

// Wording for fee reminders: WhatsApp messages, the student's email and the
// owner's daily list. Plain functions, safe to use in the browser too.

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
export const formatLongDate = (isoDate: string) => longDate.format(new Date(`${isoDate}T00:00:00`));

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0];
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Due = { fullName: string; phone: string; endsOn: string; seatNumber: string | null; feeInr: number | null };

export function whatsappText(student: Pick<Due, "fullName" | "endsOn">, today: string) {
  const when = student.endsOn < today ? `ended on ${formatLongDate(student.endsOn)}` : `ends on ${formatLongDate(student.endsOn)}`;
  return `Hi ${firstName(student.fullName)}, this is ${site.name}. Your membership ${when}. Please renew at the desk to keep your seat, or call us on ${site.phone}. Thank you!`;
}

export const whatsappLink = (phone: string, text: string) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

export function studentEmail(student: Pick<Due, "fullName" | "endsOn">) {
  const date = formatLongDate(student.endsOn);
  const lines = [
    `Hi ${firstName(student.fullName)},`,
    `Your membership at ${site.name} ends on ${date}.`,
    `To keep your seat, please renew at the desk before then, or call us on ${site.phone}.`,
    `We’re open every day, ${site.hours}.`,
    `${site.name}, ${site.area}, ${site.city}`,
  ];
  return {
    subject: `Your ${site.name} membership ends on ${date}`,
    text: lines.join("\n\n"),
    html: lines.map((l) => `<p>${escape(l)}</p>`).join(""),
  };
}

export function ownerDigest(students: Due[], today: string, inrFormat: (n: number) => string) {
  const count = `${students.length} ${students.length === 1 ? "membership ends" : "memberships end"}`;
  const rows = students.map((s) => ({
    s,
    seat: s.seatNumber ? `desk ${s.seatNumber}` : "sits anywhere",
    fee: s.feeInr != null ? inrFormat(s.feeInr) : "no fee set",
    link: whatsappLink(s.phone, whatsappText(s, today)),
  }));
  return {
    subject: `Fee reminders: ${count} in the next 10 days`,
    text: [
      `${count} in the next 10 days:`,
      ...rows.map(({ s, seat, fee, link }) => `- ${s.fullName}, ${seat}, ends ${formatLongDate(s.endsOn)}, ${fee}, ${s.phone}\n  WhatsApp: ${link}`),
      "Students with an email address have been emailed too.",
    ].join("\n\n"),
    html: `<p>${escape(count)} in the next 10 days:</p><ul>${rows
      .map(
        ({ s, seat, fee, link }) =>
          `<li><strong>${escape(s.fullName)}</strong>, ${escape(seat)}, ends ${escape(formatLongDate(s.endsOn))}, ${escape(fee)}, ${escape(s.phone)}. <a href="${link}">Send on WhatsApp</a></li>`,
      )
      .join("")}</ul><p>Students with an email address have been emailed too.</p>`,
  };
}
