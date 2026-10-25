import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StudentForm } from "@/components/admin/student-form";
import { requireAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { getStudent } from "@/lib/students";

export const metadata: Metadata = { title: "Edit student" };

export default function EditStudentPage({ params }: PageProps<"/admin/students/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading student…</p>}>
      <EditStudent params={params} />
    </Suspense>
  );
}

async function EditStudent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();
  const back = adminHref(`/students/${id}`);

  return (
    <>
      <Link href={back} className="link-quiet text-caption">
        Back to {student.fullName}
      </Link>
      <h1 className="mt-6 mb-10 font-display text-h3">Edit {student.fullName}</h1>
      <StudentForm
        mode="edit"
        studentId={id}
        cancelHref={back}
        saved={{ aadhaarLast4: student.aadhaarLast4, panLast4: student.panLast4, documents: student.documents }}
        initial={{
          fullName: student.fullName,
          phone: student.phone,
          email: student.email ?? "",
          examTarget: student.examTarget,
          seating: student.seating ?? "open",
          seatNumber: student.seatNumber ?? "",
          feeInr: student.feeInr != null ? String(student.feeInr) : "",
          emergencyName: student.emergencyName ?? "",
          emergencyPhone: student.emergencyPhone ?? "",
          notes: student.notes ?? "",
        }}
      />
    </>
  );
}
