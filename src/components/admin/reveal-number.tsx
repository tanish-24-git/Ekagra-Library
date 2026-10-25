"use client";
import { useState, useTransition } from "react";
import { revealNumber } from "@/app/admin/actions";
import { formatAadhaar } from "@/lib/id-numbers";

// A masked Aadhaar or PAN number with a button that fetches the full one.
export function RevealNumber({ studentId, kind, masked }: { studentId: string; kind: "aadhaar" | "pan" | "licence"; masked: string }) {
  const [full, setFull] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setFull(full ? null : await revealNumber(studentId, kind));
    });

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-4">
      <span className="tabular-nums tracking-wide">{full ? (kind === "aadhaar" ? formatAadhaar(full) : full) : masked}</span>
      <button type="button" onClick={toggle} disabled={pending} className="link-quiet cursor-pointer text-caption disabled:opacity-60">
        {pending ? "Loading…" : full ? "Hide" : "Show full number"}
      </button>
    </span>
  );
}
