import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/labels";
import { whatsappLink, whatsappText } from "@/lib/reminder-text";
import { REMIND_DAYS_BEFORE, type FeeStatus, type StudentRecord } from "@/lib/students";
import { SendRemindersButton } from "./send-reminders-button";

type Row = StudentRecord & { fee: FeeStatus; href: string };

// Who needs reminding: memberships ending within REMIND_DAYS_BEFORE days, and
// overdue ones. Each has a ready-to-send WhatsApp message and a way to renew.
export function DueList({ rows, today }: { rows: Row[]; today: string }) {
  const due = rows
    .filter((r) => r.status === "active" && r.endsOn && (r.fee.kind === "due" || r.fee.kind === "overdue"))
    .sort((a, b) => a.endsOn!.localeCompare(b.endsOn!));

  return (
    <section aria-labelledby="due-title" className="mb-14 border border-rule bg-linen p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 id="due-title" className="font-display text-h4">
            Fees due
          </h2>
          <p className="mt-1 max-w-xl text-caption text-ink-soft">
            Memberships ending in the next {REMIND_DAYS_BEFORE} days, and overdue ones. Email reminders go out by themselves every morning at 9;
            WhatsApp opens with the message ready, and you tap Send.
          </p>
        </div>
        <SendRemindersButton />
      </div>

      {due.length === 0 ? (
        <p className="mt-6 text-ink-soft">No fees due in the next {REMIND_DAYS_BEFORE} days.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-t border-rule">
          {due.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Link href={r.href} className="link-quiet font-medium">
                  {r.fullName}
                </Link>
                <span className={cn("ml-3 text-caption", r.fee.kind === "overdue" ? "text-alert" : "text-due")}>
                  {r.fee.kind === "overdue"
                    ? `Overdue by ${r.fee.days} ${r.fee.days === 1 ? "day" : "days"} (ended ${formatShortDate(r.endsOn!)})`
                    : r.fee.days === 0
                      ? "Ends today"
                      : `Ends in ${r.fee.days} ${r.fee.days === 1 ? "day" : "days"}, ${formatShortDate(r.endsOn!)}`}
                </span>
                <span className="block text-caption text-ink-soft">
                  {r.phone}
                  {r.email ? `, ${r.email}` : ", no email"}
                </span>
              </div>
              <div className="flex gap-5 text-body">
                <a href={whatsappLink(r.phone, whatsappText({ fullName: r.fullName, endsOn: r.endsOn! }, today))} target="_blank" rel="noreferrer" className="link-quiet">
                  Send on WhatsApp
                </a>
                <Link href={`${r.href}#renew`} className="link-quiet">
                  Renew
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
