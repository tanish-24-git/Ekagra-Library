import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MockNotice } from "@/components/admin/mock-notice";
import { requireAdmin } from "@/lib/admin-guard";
import { listEnquiries } from "@/lib/students";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return (
    <>
      <h1 className="mb-10 font-display text-h3">Enquiries</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading enquiries…</p>}>
        <EnquiryList />
      </Suspense>
    </>
  );
}

const received = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Counts how often each value appears, ignoring case and extra spaces, so
// "dhanori" and "Dhanori " count as one area.
function tally(values: string[]) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of values) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key) ?? { label: label.replace(/(^|\s)\p{Ll}/gu, (c) => c.toUpperCase()), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function Tally({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div>
      <h2 className="text-caption text-ink-soft">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 8).map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3 text-body">
              <span className="truncate">{r.label}</span>
              <span aria-hidden className="h-1.5 rounded-full bg-bronze/70" style={{ width: `${(r.count / max) * 100}%` }} />
              <span className="text-right tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-ink-soft">Not enough enquiries yet.</p>
      )}
    </div>
  );
}

async function EnquiryList() {
  await connection();
  await requireAdmin();
  const enquiries = await listEnquiries();

  if (enquiries.length === 0) {
    return <p className="text-ink-soft">No enquiries yet. They appear here when someone sends the enquiry form on the website.</p>;
  }

  const areas = tally(enquiries.map((e) => e.location ?? ""));
  const exams = tally(enquiries.flatMap((e) => (e.preparingFor ?? "").split(",")));

  return (
    <>
      <MockNotice />
      <section aria-label="Summary" className="mb-12 grid gap-10 border border-rule bg-linen p-5 md:grid-cols-2 md:p-6">
        <Tally title="Where they live" rows={areas} />
        <Tally title="Preparing for" rows={exams} />
      </section>

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
              <span className="block text-caption text-ink-soft">Lives in</span>
              {e.location ?? "Not given"}
            </p>
            <p className="md:col-span-4">
              <span className="block text-caption text-ink-soft">Preparing for</span>
              {e.preparingFor ?? "Not given"}
              {e.reason && <span className="mt-1 block text-caption text-ink-soft">“{e.reason}”</span>}
            </p>
            <p className="text-caption text-ink-soft md:col-span-2 md:text-right">{received.format(new Date(e.createdAt))}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
