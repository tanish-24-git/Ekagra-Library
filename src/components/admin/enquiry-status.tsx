"use client";
import { useTransition } from "react";
import { setEnquiryStatusAction } from "@/app/admin/actions";
import type { EnquiryRecord } from "@/lib/students";

const labels: Record<EnquiryRecord["status"], string> = { new: "New", contacted: "Contacted", joined: "Joined", closed: "Closed" };

// Where an enquiry stands. Saves as soon as you pick a status.
export function EnquiryStatus({ id, status }: { id: string; status: EnquiryRecord["status"] }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="text-caption text-ink-soft">
      <span className="sr-only">Status</span>
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as EnquiryRecord["status"];
          startTransition(() => setEnquiryStatusAction(id, next));
        }}
        className="rounded-none border border-rule bg-paper px-2 py-1 text-caption text-ink focus:border-ink focus:outline-none disabled:opacity-60"
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
