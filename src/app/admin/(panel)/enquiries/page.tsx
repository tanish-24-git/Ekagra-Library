import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MockNotice } from "@/components/admin/mock-notice";
import { requireAdmin } from "@/lib/admin-guard";
import { examLabels, seatingLabels } from "@/lib/labels";
import { listEnquiries } from "@/lib/students";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return (
    <>
      <h1 className="mb-10 font-display text-h3">Call-back requests</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading requests…</p>}>
        <EnquiryList />
      </Suspense>
    </>
  );
}

const received = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function EnquiryList() {
  await connection();
  await requireAdmin();
  const enquiries = await listEnquiries();

  if (enquiries.length === 0) {
    return <p className="text-ink-soft">No requests yet. They appear here when someone leaves their number on the website.</p>;
  }

  return (
    <>
      <MockNotice />
      <ul className="border-t border-ink">
        {enquiries.map((e) => (
          <li key={e.id} className="grid gap-2 border-b border-rule py-5 md:grid-cols-12 md:gap-6">
            <div className="md:col-span-3">
              <p className="font-medium">{e.name}</p>
              <a href={`tel:+91${e.phone}`} className="text-caption text-ink-soft tabular-nums hover:text-ink">
                {e.phone}
              </a>
            </div>
            <p className="md:col-span-3">
              {e.examTarget ? examLabels[e.examTarget] : "Exam not given"}
              <span className="block text-caption text-ink-soft">{e.seatPreference ? seatingLabels[e.seatPreference] : "Seat not chosen"}</span>
            </p>
            <p className="text-ink-soft md:col-span-4">{e.message ?? "No message"}</p>
            <p className="text-caption text-ink-soft md:col-span-2 md:text-right">{received.format(new Date(e.createdAt))}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
