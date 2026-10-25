import "server-only";
import { formatInr } from "./labels";
import { mailerReady, ownerAddress, sendMail } from "./mailer";
import { firstName, formatLongDate, ownerDigest, studentEmail } from "./reminder-text";
import { feeStatus, listStudents, logReminders, sentReminders } from "./students";
import { sendWhatsAppTemplate, whatsappReady } from "./whatsapp";

// The daily fee-reminder run (src/app/api/cron/reminders, or "Send reminders
// now" in the admin). For every active membership that ends within
// REMIND_DAYS_BEFORE days:
//  - email: the owner gets one email listing them, then each student with an
//    email address gets their own (needs GMAIL_USER and GMAIL_APP_PASSWORD);
//  - WhatsApp: each student gets the approved template (needs WHATSAPP_*).
// Each channel goes out once per membership and is logged. A channel without
// its settings is a dry run: it reports what it would send and logs nothing,
// so adding the settings later is all it takes to switch it on.

export type ReminderRun = {
  date: string;
  due: number;
  email: { ready: boolean; owner: { to: string; students: string[] } | null; students: string[]; noEmail: string[] };
  whatsapp: { ready: boolean; students: string[] };
  errors: string[];
};

export async function runReminders(): Promise<ReminderRun> {
  const today = new Date().toISOString().slice(0, 10);
  const due = (await listStudents()).filter(
    (s) => s.status === "active" && s.membershipId && s.endsOn && feeStatus(s.endsOn, today).kind === "due",
  );
  const sent = await sentReminders(due.map((s) => s.membershipId!));
  const already = (id: string, kind: "owner" | "student_email" | "student_whatsapp") => sent.some((r) => r.membershipId === id && r.kind === kind);

  const emailReady = mailerReady();
  const waReady = whatsappReady();
  const run: ReminderRun = {
    date: today,
    due: due.length,
    email: { ready: emailReady, owner: null, students: [], noEmail: due.filter((s) => !s.email).map((s) => s.fullName) },
    whatsapp: { ready: waReady, students: [] },
    errors: [],
  };

  const forOwner = due.filter((s) => !already(s.membershipId!, "owner"));
  if (forOwner.length) {
    const to = ownerAddress() || "(owner email not set)";
    try {
      await sendMail({ to, ...ownerDigest(forOwner.map((s) => ({ ...s, endsOn: s.endsOn! })), today, formatInr) });
      run.email.owner = { to, students: forOwner.map((s) => s.fullName) };
      if (emailReady) await logReminders(forOwner.map((s) => ({ membershipId: s.membershipId!, kind: "owner", sentTo: to })));
    } catch (e) {
      run.errors.push(`Owner email to ${to}: ${(e as Error).message}`);
    }
  }

  for (const s of due.filter((s) => s.email && !already(s.membershipId!, "student_email"))) {
    try {
      await sendMail({ to: s.email!, ...studentEmail({ ...s, endsOn: s.endsOn! }) });
      run.email.students.push(`${s.fullName} <${s.email}>`);
      if (emailReady) await logReminders([{ membershipId: s.membershipId!, kind: "student_email", sentTo: s.email! }]);
    } catch (e) {
      run.errors.push(`Email to ${s.fullName}: ${(e as Error).message}`);
    }
  }

  for (const s of due.filter((s) => !already(s.membershipId!, "student_whatsapp"))) {
    try {
      await sendWhatsAppTemplate(s.phone, [firstName(s.fullName), formatLongDate(s.endsOn!)]);
      run.whatsapp.students.push(`${s.fullName} (${s.phone})`);
      if (waReady) await logReminders([{ membershipId: s.membershipId!, kind: "student_whatsapp", sentTo: s.phone }]);
    } catch (e) {
      run.errors.push(`WhatsApp to ${s.fullName}: ${(e as Error).message}`);
    }
  }

  return run;
}
