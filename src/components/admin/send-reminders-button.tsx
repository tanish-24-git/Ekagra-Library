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
        {pending ? "Sending…" : "Send email reminders now"}
      </button>
      {run && <p className="max-w-md text-caption text-ink-soft md:text-right">{summary(run)}</p>}
    </div>
  );
}

function summary(run: ReminderRun) {
  const parts: string[] = [];
  const owner = run.owner ? run.owner.students.length : 0;
  const students = run.studentEmails.length;
  if (!owner && !students) parts.push("Nothing new to send: everyone due has already been reminded.");
  else if (run.dryRun)
    parts.push(
      `Dry run, nothing sent: Gmail isn’t set up yet (GMAIL_USER and GMAIL_APP_PASSWORD). It would email you about ${owner} and email ${students} ${students === 1 ? "student" : "students"}.`,
    );
  else parts.push(`Sent: you were emailed about ${owner}, and ${students} ${students === 1 ? "student was" : "students were"} emailed.`);
  if (run.noEmail.length) parts.push(`No email on file for ${run.noEmail.join(", ")}: use WhatsApp.`);
  if (run.errors.length) parts.push(`Failed: ${run.errors.join("; ")}`);
  return parts.join(" ");
}
