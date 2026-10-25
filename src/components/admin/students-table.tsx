"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Seating } from "@/db/schema";
import { cn } from "@/lib/cn";
import { examLabels, formatInr, formatShortDate, seatingLabels } from "@/lib/labels";
import type { FeeStatus, StudentRecord } from "@/lib/students";

export type StudentRow = StudentRecord & { fee: FeeStatus; href: string };

type FeeFilter = "all" | "due" | "overdue";
type StatusFilter = "current" | "active" | "paused" | "left" | "all";

const inputClass = "rounded-none border border-rule bg-paper px-3 py-2 text-body focus:border-ink focus:outline-none";

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [seating, setSeating] = useState<Seating | "all">("all");
  const [fee, setFee] = useState<FeeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("current");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.fullName.toLowerCase().includes(q) || r.phone.includes(q) || r.seatNumber?.toLowerCase().includes(q))
      .filter((r) => seating === "all" || r.seating === seating)
      .filter((r) => (status === "current" ? r.status !== "left" : status === "all" || r.status === status))
      .filter((r) => fee === "all" || (r.status === "active" && r.fee.kind === fee))
      .sort((a, b) => urgency(a) - urgency(b));
  }, [rows, query, seating, fee, status]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-1 text-caption text-ink-soft">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone or desk"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-caption text-ink-soft">
          Seat
          <select value={seating} onChange={(e) => setSeating(e.target.value as Seating | "all")} className={inputClass}>
            <option value="all">All seats</option>
            {Object.entries(seatingLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-ink-soft">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputClass}>
            <option value="current">Active and paused</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="left">Left</option>
            <option value="all">Everyone</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-ink-soft">
          Fees
          <select value={fee} onChange={(e) => setFee(e.target.value as FeeFilter)} className={inputClass}>
            <option value="all">All</option>
            <option value="due">Due in 10 days</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-x-auto border-t border-ink">
        <table className="w-full min-w-[680px] text-left text-body">
          <caption className="sr-only">Students, most urgent fees first</caption>
          <thead className="text-caption text-ink-soft">
            <tr className="border-b border-rule">
              <th scope="col" className="py-3 pr-4 font-normal">Desk</th>
              <th scope="col" className="py-3 pr-4 font-normal">Student</th>
              <th scope="col" className="py-3 pr-4 font-normal">Preparing for</th>
              <th scope="col" className="py-3 pr-4 font-normal">Fees</th>
              <th scope="col" className="py-3 text-right font-normal">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-rule align-top">
                <td className="py-4 pr-4 tabular-nums">{r.seatNumber ?? <span className="text-ink-soft">Sits anywhere</span>}</td>
                <td className="py-4 pr-4">
                  <Link href={r.href} className="link-quiet block font-medium">
                    {r.fullName}
                  </Link>
                  <a href={`tel:+91${r.phone}`} className="text-caption text-ink-soft tabular-nums hover:text-ink">
                    {r.phone}
                  </a>
                  <span className={cn("block text-caption", r.documents.length ? "text-ink-soft" : "text-due")}>
                    {r.documents.length ? `${r.documents.length} of 3 ID documents` : "No ID documents"}
                  </span>
                </td>
                <td className="py-4 pr-4">{examLabels[r.examTarget]}</td>
                <td className="py-4 pr-4">
                  <FeeCell fee={r.fee} endsOn={r.endsOn} status={r.status} pausedOn={r.pausedOn} />
                </td>
                <td className="py-4 text-right tabular-nums">{r.feeInr != null ? formatInr(r.feeInr) : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="py-10 text-center text-ink-soft">No students match these filters. Clear the search or change the filters.</p>
        )}
      </div>
      <p className="mt-3 text-caption text-ink-soft">
        Showing {visible.length} of {rows.length}
      </p>
    </div>
  );
}

function FeeCell({ fee, endsOn, status, pausedOn }: { fee: FeeStatus; endsOn: string | null; status: StudentRecord["status"]; pausedOn: string | null }) {
  if (status === "paused" || status === "left") {
    return (
      <span className="inline-flex items-center gap-2 text-ink-soft">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full border border-current" />
        {status === "paused" ? `Paused${pausedOn ? ` since ${formatShortDate(pausedOn)}` : ""}` : "Left"}
      </span>
    );
  }
  const tone = { paid: "text-ok", due: "text-due", overdue: "text-alert", none: "text-ink-soft" }[fee.kind];
  const label =
    fee.kind === "overdue"
      ? `Overdue by ${fee.days} ${fee.days === 1 ? "day" : "days"}`
      : fee.kind === "due"
        ? fee.days === 0
          ? "Due today"
          : `Due in ${fee.days} ${fee.days === 1 ? "day" : "days"}`
        : fee.kind === "paid" && endsOn
          ? `Paid till ${formatShortDate(endsOn)}`
          : "No plan";
  return (
    <span className={cn("inline-flex items-center gap-2", tone)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

// Overdue first, then due soonest, then paid; paused and left at the end.
const urgency = ({ fee: f, status }: StudentRow) =>
  status !== "active" ? 2000 : f.kind === "overdue" ? -1000 + -f.days : f.kind === "due" ? f.days : f.kind === "paid" ? 100 + f.days : 1000;
