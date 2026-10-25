import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { confirmPaymentAction, rejectSubmissionAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { answer, listSubmissions, paymentDetails, type IntakeSummary } from "@/lib/intake";
import { formatDate, formatInr, paymentModeLabels } from "@/lib/labels";
import { listStudents, type StudentRecord } from "@/lib/students";

export const metadata: Metadata = { title: "Form submissions" };

export default function FormSubmissionsPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-h3">Form submissions</h1>
      <p className="mb-10 max-w-2xl text-ink-soft">
        Registrations and payments sent through your Google Forms. The forms keep their own copy; these are the second copy, stored encrypted.
      </p>
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <Submissions />
      </Suspense>
    </>
  );
}

const received = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const statusLabel = { new: "New", accepted: "Done", rejected: "Rejected" } as const;

async function Submissions() {
  await connection();
  await requireAdmin();
  const [submissions, students] = await Promise.all([listSubmissions(), listStudents()]);
  const connected = !!process.env.INTAKE_SECRET;
  const registrations = submissions.filter((s) => s.form === "registration");
  const payments = submissions.filter((s) => s.form === "payment");

  return (
    <>
      {!connected && (
        <p className="mb-10 border-l-2 border-due bg-linen px-4 py-3 text-caption text-ink">
          Google Forms isn’t connected yet. Set <code>INTAKE_SECRET</code> in the settings and paste <code>scripts/google-forms/intake.gs</code> into each
          form (setup guide, section 4). New responses then appear here by themselves.
        </p>
      )}
      <Section title="Registrations" empty="No registrations yet.">
        {registrations.map((s) => (
          <Registration key={s.id} s={s} />
        ))}
      </Section>
      <Section title="Payments" empty="No payments yet.">
        {payments.map((s) => (
          <Payment key={s.id} s={s} students={students} />
        ))}
      </Section>
    </>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-14">
      <h2 className="mb-4 font-display text-h4">{title}</h2>
      {children.length ? <ul className="border-t border-ink">{children}</ul> : <p className="text-ink-soft">{empty}</p>}
    </section>
  );
}

function Files({ s }: { s: IntakeSummary }) {
  if (!s.files.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-x-4 text-caption">
      {s.files.map((f) => (
        <a key={f.id} href={adminHref(`/form-submissions/files/${f.id}`)} target="_blank" rel="noreferrer" className="link-quiet">
          {f.question}
        </a>
      ))}
    </span>
  );
}

function Registration({ s }: { s: IntakeSummary }) {
  const a = s.answers;
  return (
    <li className="grid gap-3 border-b border-rule py-5 md:grid-cols-12 md:gap-6">
      <div className="md:col-span-4">
        <p className="font-medium">{s.name ?? "No name"}</p>
        <p className="text-caption text-ink-soft tabular-nums">{s.phone ?? "No number"}</p>
        <Files s={s} />
      </div>
      <p className="text-caption md:col-span-5">
        {[answer(a, "Preparing for"), answer(a, "Address"), answer(a, "Studying or working in")].filter(Boolean).join(" · ") || "No other details"}
      </p>
      <div className="flex flex-col items-start gap-1 text-caption md:col-span-3 md:items-end">
        <span className="text-ink-soft">{received.format(new Date(s.submittedAt))}</span>
        <span>{statusLabel[s.status]}</span>
        {s.status === "new" && (
          <>
            <Link href={adminHref(`/students/new?from=${s.id}`)} className="link-quiet text-body">
              Add as student
            </Link>
            <ConfirmButton action={rejectSubmissionAction.bind(null, s.id)} label="Reject" confirm="Reject this registration?" className="text-caption" />
          </>
        )}
        {s.studentId && (
          <Link href={adminHref(`/students/${s.studentId}`)} className="link-quiet">
            Open student
          </Link>
        )}
      </div>
    </li>
  );
}

function Payment({ s, students }: { s: IntakeSummary; students: StudentRecord[] }) {
  const p = paymentDetails(s.answers);
  const match = s.phone ? students.find((st) => st.phone === s.phone || st.secondaryPhone === s.phone) : undefined;
  return (
    <li className="grid gap-3 border-b border-rule py-5 md:grid-cols-12 md:gap-6">
      <div className="md:col-span-4">
        <p className="font-medium">{s.name ?? "No name"}</p>
        <p className="text-caption text-ink-soft tabular-nums">{s.phone ?? "No number"}</p>
        <Files s={s} />
      </div>
      <p className="md:col-span-5">
        {formatInr(p.amountInr)} for {p.months} {p.months === 1 ? "month" : "months"} by {paymentModeLabels[p.mode]}
        {p.paidOn && <span className="block text-caption text-ink-soft">Paid on {formatDate(p.paidOn)}</span>}
        <span className="block text-caption text-ink-soft">
          {match ? (
            <>
              Matches{" "}
              <Link href={adminHref(`/students/${match.id}`)} className="link-quiet">
                {match.fullName}
              </Link>
            </>
          ) : (
            "No student has this mobile number yet. Add them, or fix their number, then confirm."
          )}
        </span>
      </p>
      <div className="flex flex-col items-start gap-1 text-caption md:col-span-3 md:items-end">
        <span className="text-ink-soft">{received.format(new Date(s.submittedAt))}</span>
        <span>{statusLabel[s.status]}</span>
        {s.status === "new" && match && (
          <ConfirmButton
            action={confirmPaymentAction.bind(null, s.id, match.id)}
            label="Confirm and renew"
            confirm={`Record ${formatInr(p.amountInr)} and add ${p.months} ${p.months === 1 ? "month" : "months"} for ${match.fullName}?`}
            className="text-body"
          />
        )}
        {s.status === "new" && (
          <ConfirmButton action={rejectSubmissionAction.bind(null, s.id)} label="Reject" confirm="Reject this payment?" className="text-caption" />
        )}
      </div>
    </li>
  );
}
