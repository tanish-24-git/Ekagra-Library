import type { Metadata } from "next";
import { AddStudentForm } from "@/components/admin/add-student-form";

export const metadata: Metadata = { title: "Add student" };

export default function NewStudentPage() {
  return (
    <>
      <h1 className="mb-10 font-display text-h3">Add student</h1>
      <AddStudentForm />
    </>
  );
}
