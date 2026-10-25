import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { StudentForm } from "@/components/admin/student-form";
import { requireAdmin } from "@/lib/admin-guard";
import { documentLabels } from "@/lib/documents";
import { answer, documentKindFor, examFor, getSubmission } from "@/lib/intake";

export const metadata: Metadata = { title: "Add student" };

export default function NewStudentPage({ searchParams }: PageProps<"/admin/students/new">) {
  return (
    <>
      <h1 className="mb-10 font-display text-h3">Add student</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <NewStudentForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// Rendered per request so the joining date defaults to today. With ?from=<id>
// it starts from a Google Forms registration.
async function NewStudentForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  await requireAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const from = (await searchParams).from;
  const submission = typeof from === "string" ? await getSubmission(from) : null;
  if (!submission || submission.form !== "registration" || submission.status !== "new") {
    return <StudentForm mode="create" today={today} />;
  }

  const a = submission.answers;
  const preparing = answer(a, "Preparing for");
  const initial = {
    intakeId: submission.id,
    fullName: answer(a, "Full name", "Name"),
    phone: answer(a, "Primary mobile", "Mobile", "Phone"),
    secondaryPhone: answer(a, "Secondary mobile"),
    email: answer(a, "Email", "Email address"),
    address: answer(a, "Address"),
    occupation: answer(a, "Studying or working in", "Occupation"),
    examTarget: examFor(preparing),
    notes: preparing ? `From the Google Form. Preparing for: ${preparing}` : "From the Google Form.",
    aadhaar: answer(a, "Aadhaar number"),
    pan: answer(a, "PAN number"),
    licence: answer(a, "Driving licence number", "Driving license number"),
    consent: answer(a, "Consent") ? "on" : "",
  };
  const formFiles = submission.files.flatMap((f) => {
    const kind = documentKindFor(f.question);
    return kind ? [documentLabels[kind]] : [];
  });
  return <StudentForm mode="create" today={today} initial={initial} formFiles={formFiles} />;
}
