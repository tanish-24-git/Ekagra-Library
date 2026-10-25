import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RevealNumber } from "@/components/admin/reveal-number";
import { requireAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { DOCUMENT_KINDS, documentLabels } from "@/lib/documents";
import { maskAadhaar, maskPan } from "@/lib/id-numbers";
import { examLabels, formatInr, formatShortDate, seatingLabels } from "@/lib/labels";
import { feeStatus, getStudent, listStudentDocuments } from "@/lib/students";

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
  const [student, documents] = await Promise.all([getStudent(id), listStudentDocuments(id)]);
  if (!student) notFound();

  const fee = feeStatus(student.endsOn);
  const feeText =
    fee.kind === "overdue"
      ? `Overdue by ${fee.days} ${fee.days === 1 ? "day" : "days"}`
      : fee.kind === "due"
        ? `Due in ${fee.days} ${fee.days === 1 ? "day" : "days"}`
        : fee.kind === "paid"
          ? "Paid"
          : "No plan";

  const facts = [
    { label: "Mobile", value: <a href={`tel:+91${student.phone}`} className="link-quiet tabular-nums">{student.phone}</a> },
    { label: "Preparing for", value: examLabels[student.examTarget] },
    { label: "Seat", value: student.seating === "reserved" ? `Desk ${student.seatNumber}` : student.seating ? seatingLabels[student.seating] : "None" },
    { label: "Joined", value: formatShortDate(student.joinedOn) },
    { label: "Membership ends", value: student.endsOn ? `${formatShortDate(student.endsOn)} (${feeText})` : "No plan" },
    { label: "Monthly fee", value: student.feeInr != null ? formatInr(student.feeInr) : "None" },
  ];

  return (
    <article className="mt-6">
      <h1 className="font-display text-h3">{student.fullName}</h1>

      <dl className="mt-8 grid border-t border-rule sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="border-b border-rule py-4 pr-4">
            <dt className="text-caption text-ink-soft">{f.label}</dt>
            <dd className="mt-1">{f.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-14 font-display text-h4">ID documents</h2>
      <dl className="mt-4 grid border-t border-rule sm:grid-cols-2">
        <div className="border-b border-rule py-4 pr-4">
          <dt className="text-caption text-ink-soft">Aadhaar number</dt>
          <dd className="mt-1">
            {student.aadhaarLast4 ? <RevealNumber studentId={student.id} kind="aadhaar" masked={maskAadhaar(student.aadhaarLast4)} /> : <span className="text-ink-soft">Not given</span>}
          </dd>
        </div>
        <div className="border-b border-rule py-4 pr-4">
          <dt className="text-caption text-ink-soft">PAN number</dt>
          <dd className="mt-1">
            {student.panLast4 ? <RevealNumber studentId={student.id} kind="pan" masked={maskPan(student.panLast4)} /> : <span className="text-ink-soft">Not given</span>}
          </dd>
        </div>
      </dl>

      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {DOCUMENT_KINDS.map((kind) => {
          const doc = documents.find((d) => d.kind === kind);
          const src = `/api/students/${student.id}/documents/${kind}`;
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
              ) : (
                <p className="mt-1 grid aspect-[4/3] place-items-center border border-dashed border-rule text-caption text-ink-soft">Not uploaded</p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
