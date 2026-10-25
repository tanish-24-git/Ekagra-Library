import "server-only";
import { formatInr } from "./labels";
import { mailerReady, ownerAddress, sendMail } from "./mailer";
import { ownerDigest, studentEmail } from "./reminder-text";
import { feeStatus, listStudents, logReminders, sentReminders } from "./students";

// The daily fee-reminder run (src/app/api/cron/reminders, or "Send reminders
// now" in the admin). For every active membership that ends within
// REMIND_DAYS_BEFORE days: the owner gets one email listing them, then each
// student with an email address gets their own. Each goes out once per
// membership. Without Gmail settings it's a dry run that sends and logs nothing.

export type ReminderRun = {
  date: string;
  dryRun: boolean;
  due: number;
  owner: { to: string; students: string[] } | null;
  studentEmails: string[];
  noEmail: string[];
  errors: string[];
};

export async function runReminders(): Promise<ReminderRun> {
  const today = new Date().toISOString().slice(0, 10);
  const due = (await listStudents()).filter(
    (s) => s.status === "active" && s.membershipId && s.endsOn && feeStatus(s.endsOn, today).kind === "due",
  );
  const sent = await sentReminders(due.map((s) => s.membershipId!));
  const already = (id: string, kind: "owner" | "student_email") => sent.some((r) => r.membershipId === id && r.kind === kind);

  const forOwner = due.filter((s) => !already(s.membershipId!, "owner"));
  const forStudents = due.filter((s) => s.email && !already(s.membershipId!, "student_email"));
  const dryRun = !mailerReady();
  const run: ReminderRun = {
    date: today,
    dryRun,
    due: due.length,
    owner: null,
    studentEmails: [],
    noEmail: due.filter((s) => !s.email).map((s) => s.fullName),
    errors: [],
  };

  if (forOwner.length) {
    const to = ownerAddress() || "(owner email not set)";
    try {
      await sendMail({ to, ...ownerDigest(forOwner.map((s) => ({ ...s, endsOn: s.endsOn! })), today, formatInr) });
      run.owner = { to, students: forOwner.map((s) => s.fullName) };
      if (!dryRun) await logReminders(forOwner.map((s) => ({ membershipId: s.membershipId!, kind: "owner", sentTo: to })));
    } catch (e) {
      run.errors.push(`Owner email to ${to}: ${(e as Error).message}`);
    }
  }

  for (const s of forStudents) {
    try {
      await sendMail({ to: s.email!, ...studentEmail({ ...s, endsOn: s.endsOn! }) });
      run.studentEmails.push(`${s.fullName} <${s.email}>`);
      if (!dryRun) await logReminders([{ membershipId: s.membershipId!, kind: "student_email", sentTo: s.email! }]);
    } catch (e) {
      run.errors.push(`${s.fullName} <${s.email}>: ${(e as Error).message}`);
    }
  }

  return run;
}
