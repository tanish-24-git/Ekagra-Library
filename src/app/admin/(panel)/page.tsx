import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MockNotice } from "@/components/admin/mock-notice";
import { StudentsTable } from "@/components/admin/students-table";
import { buttonClass } from "@/components/ui/button";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { feeStatus, listEnquiries, listStudents, seatSummary } from "@/lib/students";

export default function AdminHome() {
  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <h1 className="font-display text-h3">Students</h1>
        <Link href={adminHref("/students/new")} className={buttonClass("primary", "self-start py-2.5")}>
          Add student
        </Link>
      </div>
      <Suspense fallback={<p className="text-ink-soft">Loading students…</p>}>
        <StudentsOverview />
      </Suspense>
    </>
  );
}

async function StudentsOverview() {
  await connection();
  await requireAdmin();
  const [students, enquiries] = await Promise.all([listStudents(), listEnquiries()]);
  const seats = await seatSummary(site.seats, students);
  const rows = students.map((s) => ({ ...s, fee: feeStatus(s.endsOn), href: adminHref(`/students/${s.id}`) }));
  const active = rows.filter((r) => r.status === "active").length;
  const due = rows.filter((r) => r.fee.kind === "due").length;
  const overdue = rows.filter((r) => r.fee.kind === "overdue").length;
  const newEnquiries = enquiries.filter((e) => e.status === "new").length;

  const stats = [
    { label: "Active students", value: String(active) },
    { label: "Reserved desks", value: `${seats.reserved} / ${seats.totalSeats}` },
    { label: "Sit anywhere", value: String(seats.open) },
    { label: "Fees due this week", value: String(due), tone: due ? "text-due" : undefined },
    { label: "Overdue", value: String(overdue), tone: overdue ? "text-alert" : undefined },
    { label: "New enquiries", value: String(newEnquiries), href: adminHref("/enquiries") },
  ];

  return (
    <>
      <MockNotice />
      <dl className="mb-12 grid grid-cols-2 border-t border-rule md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="border-b border-rule py-5 pr-4 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0">
            <dt className="text-caption text-ink-soft">{s.label}</dt>
            <dd className={`mt-1 font-display text-h4 tabular-nums ${s.tone ?? ""}`}>
              {s.href ? (
                <Link href={s.href} className="link-quiet">
                  {s.value}
                </Link>
              ) : (
                s.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <StudentsTable rows={rows} />
    </>
  );
}
