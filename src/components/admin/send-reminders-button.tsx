"use client";
import { useState, useTransition } from "react";
import { sendRemindersNow } from "@/app/admin/actions";
import type { ReminderRun } from "@/lib/reminders";

// Runs today's email reminders on demand and says what happened.
export function SendRemindersButton() {
  const [run, setRun] = useState<ReminderRun>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setRun(await sendRemindersNow()))}
        className="cursor-pointer border border-ink px-4 py-2 text-body text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reminders now"}
      </button>
      {run && <p className="max-w-md text-caption text-ink-soft md:text-right">{summary(run)}</p>}
    </div>
  );
}

function summary(run: ReminderRun) {
  const parts: string[] = [];
  const owner = run.email.owner ? run.email.owner.students.length : 0;
  const emails = run.email.students.length;
  const was = (n: number) => `${n} ${n === 1 ? "student" : "students"}`;

  if (!owner && !emails) parts.push("Email: nothing new to send.");
  else if (!run.email.ready) parts.push(`Email (dry run, Gmail not set up yet): would email you about ${owner} and email ${was(emails)}.`);
  else parts.push(`Email sent: you about ${owner}, and ${was(emails)}.`);

  const wa = run.whatsapp.students.length;
  if (!wa) parts.push("WhatsApp: nothing new to send.");
  else if (!run.whatsapp.ready) parts.push(`WhatsApp (not connected yet): would message ${was(wa)}. Use the Send on WhatsApp buttons meanwhile.`);
  else parts.push(`WhatsApp sent to ${was(wa)}.`);

  if (run.email.noEmail.length) parts.push(`No email on file for ${run.email.noEmail.join(", ")}.`);
  if (run.errors.length) parts.push(`Failed: ${run.errors.join("; ")}`);
  return parts.join(" ");
}
