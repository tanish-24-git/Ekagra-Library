import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { StudentForm } from "@/components/admin/student-form";
import { requireAdmin } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Add student" };

export default function NewStudentPage() {
  return (
    <>
      <h1 className="mb-10 font-display text-h3">Add student</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <NewStudentForm />
      </Suspense>
    </>
  );
}

// Rendered per request so the joining date defaults to today.
async function NewStudentForm() {
  await connection();
  await requireAdmin();
  return <StudentForm mode="create" today={new Date().toISOString().slice(0, 10)} />;
}
