import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  deleteDocumentAction,
  deleteStudentAction,
  markLeftAction,
  pauseStudentAction,
  removeIdNumberAction,
  resumeStudentAction,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { RenewForm } from "@/components/admin/renew-form";
import { RevealNumber } from "@/components/admin/reveal-number";
import { requireAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { DOCUMENT_KINDS, documentLabels } from "@/lib/documents";
import { maskAadhaar, maskPan } from "@/lib/id-numbers";
import { examLabels, formatInr, formatShortDate, paymentModeLabels, seatingLabels } from "@/lib/labels";
import { whatsappLink, whatsappText } from "@/lib/reminder-text";
import { feeStatus, getStudent, listPayments, listStudentDocuments } from "@/lib/students";

export const metadata: Metadata = { title: "Student" };

export default function StudentPage({ params }: PageProps<"/admin/students/[id]">) {
  return (
    <>
      <Link href={adminHref()} className="link-quiet text-caption">
        All students
      </Link>
      <Suspense fallback={<p className="mt-8 text-ink-soft">Loading student…</p>}>
        <StudentDetail params={params} />
      </Suspense>
    </>
  );
}

async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const [student, documents, payments] = await Promise.all([getStudent(id), listStudentDocuments(id), listPayments(id)]);
  if (!student) notFound();
  const today = new Date().toISOString().slice(0, 10);

  const fee = feeStatus(student.endsOn);
  const feeText =
    fee.kind === "overdue"
      ? `Overdue by ${fee.days} ${fee.days === 1 ? "day" : "days"}`
      : fee.kind === "due"
        ? `Due in ${fee.days} ${fee.days === 1 ? "day" : "days"}`
        : fee.kind === "paid"
          ? "Paid"
          : "No plan";

  const status =
    student.status === "paused"
      ? `Paused${student.pausedOn ? ` since ${formatShortDate(student.pausedOn)}` : ""}. No reminders go out; resuming adds the paused days to the end date.`
      : student.status === "left"
        ? "Marked as left. Renew to bring them back."
        : null;

  const facts = [
    { label: "Mobile", value: <a href={`tel:+91${student.phone}`} className="link-quiet tabular-nums">{student.phone}</a> },
    { label: "Email", value: student.email ?? <span className="text-ink-soft">None, so fee reminders go by WhatsApp only</span> },
    { label: "Preparing for", value: examLabels[student.examTarget] },
    { label: "Seat", value: student.seating === "reserved" ? `Desk ${student.seatNumber}` : student.seating ? seatingLabels[student.seating] : "None" },
    { label: "Joined", value: formatShortDate(student.joinedOn) },
    { label: "Membership ends", value: student.endsOn ? `${formatShortDate(student.endsOn)} (${feeText})` : "No plan" },
    { label: "Monthly fee", value: student.feeInr != null ? formatInr(student.feeInr) : "None" },
  ];

  return (
    <article className="mt-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <h1 className="font-display text-h3">{student.fullName}</h1>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-body">
          <Link href={adminHref(`/students/${student.id}/edit`)} className="link-quiet">
            Edit
          </Link>
          {student.status === "active" && (
            <form action={pauseStudentAction.bind(null, student.id)}>
              <button type="submit" className="link-quiet cursor-pointer">
                Pause membership
              </button>
            </form>
          )}
          {student.status === "paused" && (
            <form action={resumeStudentAction.bind(null, student.id)}>
              <button type="submit" className="link-quiet cursor-pointer">
                Resume membership
              </button>
            </form>
          )}
          {student.status !== "left" && (
            <ConfirmButton action={markLeftAction.bind(null, student.id)} label="Mark as left" confirm="Take them off the active list?" />
          )}
          <ConfirmButton
            action={deleteStudentAction.bind(null, student.id)}
            label="Delete"
            confirm={`Delete ${student.fullName}, their payments and ID documents for good?`}
            className="text-alert"
          />
        </div>
      </div>
      {status && <p className="mt-4 border-l-2 border-due bg-linen px-4 py-2 text-caption text-ink">{status}</p>}

      <dl className="mt-8 grid border-t border-rule sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="border-b border-rule py-4 pr-4">
            <dt className="text-caption text-ink-soft">{f.label}</dt>
            <dd className="mt-1">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section id="renew" aria-labelledby="renew-title" className="mt-14 scroll-mt-24">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
          <h2 id="renew-title" className="font-display text-h4">
            Renew
          </h2>
          {student.endsOn && (
            <a href={whatsappLink(student.phone, whatsappText({ fullName: student.fullName, endsOn: student.endsOn }, today))} target="_blank" rel="noreferrer" className="link-quiet">
              Send fee reminder on WhatsApp
            </a>
          )}
        </div>
        <p className="mt-1 mb-6 text-caption text-ink-soft">
          The new period starts when the current one ends{fee.kind === "overdue" ? ", or today, since it has already ended" : ""}.
        </p>
        <RenewForm studentId={student.id} monthlyFee={student.feeInr ?? 0} />

        <h3 className="mt-10 text-caption text-ink-soft">Payments</h3>
        {payments.length ? (
          <table className="mt-2 w-full max-w-2xl text-left text-body">
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-rule">
                  <td className="py-2 pr-4">{formatShortDate(p.paidOn)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatInr(p.amountInr)}</td>
                  <td className="py-2 text-ink-soft">{paymentModeLabels[p.mode]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-ink-soft">No payments recorded yet.</p>
        )}
      </section>

      <h2 className="mt-14 font-display text-h4">ID documents</h2>
      <dl className="mt-4 grid border-t border-rule sm:grid-cols-2">
        <div className="border-b border-rule py-4 pr-4">
          <dt className="text-caption text-ink-soft">Aadhaar number</dt>
          <dd className="mt-1">
            {student.aadhaarLast4 ? (
              <span className="flex flex-wrap items-baseline gap-x-4">
                <RevealNumber studentId={student.id} kind="aadhaar" masked={maskAadhaar(student.aadhaarLast4)} />
                <ConfirmButton action={removeIdNumberAction.bind(null, student.id, "aadhaar")} label="Remove" confirm="Remove the saved Aadhaar number?" className="text-caption" />
              </span>
            ) : (
              <span className="text-ink-soft">Not given</span>
            )}
          </dd>
        </div>
        <div className="border-b border-rule py-4 pr-4">
          <dt className="text-caption text-ink-soft">PAN number</dt>
          <dd className="mt-1">
            {student.panLast4 ? (
              <span className="flex flex-wrap items-baseline gap-x-4">
                <RevealNumber studentId={student.id} kind="pan" masked={maskPan(student.panLast4)} />
                <ConfirmButton action={removeIdNumberAction.bind(null, student.id, "pan")} label="Remove" confirm="Remove the saved PAN number?" className="text-caption" />
              </span>
            ) : (
              <span className="text-ink-soft">Not given</span>
            )}
          </dd>
        </div>
      </dl>

      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {DOCUMENT_KINDS.map((kind) => {
          const doc = documents.find((d) => d.kind === kind);
          const src = adminHref(`/students/${student.id}/documents/${kind}`);
          return (
            <li key={kind}>
              <p className="text-caption text-ink-soft">{documentLabels[kind]}</p>
              {doc ? (
                <a href={src} target="_blank" rel="noreferrer" className="group mt-1 block border border-rule bg-paper">
                  {doc.contentType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private file, not for the image optimiser
                    <img src={src} alt={`${documentLabels[kind]} of ${student.fullName}`} className="aspect-[4/3] w-full object-contain" />
                  ) : (
                    <span className="grid aspect-[4/3] place-items-center text-ink">PDF</span>
                  )}
                  <span className="block border-t border-rule px-3 py-2 text-caption group-hover:text-ink">Open full size</span>
                </a>
              ) : null}
              {doc ? (
                <div className="mt-2 text-caption">
                  <ConfirmButton action={deleteDocumentAction.bind(null, student.id, kind)} label="Delete this file" confirm="Delete it for good?" />
                </div>
              ) : (
                <Link
                  href={adminHref(`/students/${student.id}/edit`)}
                  className="mt-1 grid aspect-[4/3] place-items-center border border-dashed border-rule text-caption text-ink-soft hover:text-ink"
                >
                  Not uploaded. Add it in Edit
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
