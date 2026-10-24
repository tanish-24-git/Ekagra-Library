"use client";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { site } from "@/content/site";
import { examLabels, seatingLabels } from "@/lib/labels";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string; fields?: Record<string, string[]> };

const fieldClass =
  "mt-2 block w-full border-0 border-b border-rule bg-transparent px-0 py-2.5 text-body text-ink placeholder:text-ink-soft/60 focus:border-ink focus:ring-0 focus:outline-none";

export function EnquiryForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const body = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ""));
    setStatus({ kind: "sending" });
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) return setStatus({ kind: "sent" });
    const json = await res?.json().catch(() => null);
    setStatus({
      kind: "error",
      message: json?.error ?? "Couldn’t send your request. Check your connection and try again, or call us.",
      fields: json?.fields,
    });
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="border-t border-ink pt-8">
        <p className="font-display text-h3">Thanks, we’ve got your number.</p>
        <p className="mt-3 max-w-[40ch] text-ink-soft">We’ll call you back soon. You’re welcome to visit any time between {site.hours}.</p>
      </div>
    );
  }

  const err = (name: string) => (status.kind === "error" ? status.fields?.[name]?.[0] : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-7 sm:grid-cols-2">
      <label className="block text-caption text-ink-soft">
        Your name
        <input name="name" required autoComplete="name" className={fieldClass} aria-invalid={!!err("name")} />
        {err("name") && <span className="mt-1 block text-bronze">{err("name")}</span>}
      </label>
      <label className="block text-caption text-ink-soft">
        Mobile number
        <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxxxxxxx" className={fieldClass} aria-invalid={!!err("phone")} />
        {err("phone") && <span className="mt-1 block text-bronze">{err("phone")}</span>}
      </label>
      <label className="block text-caption text-ink-soft">
        Preparing for
        <select name="examTarget" defaultValue="" className={fieldClass}>
          <option value="">Choose an exam</option>
          {Object.entries(examLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-caption text-ink-soft">
        Seat
        <select name="seatPreference" defaultValue="" className={fieldClass}>
          <option value="">Not sure yet</option>
          {Object.entries(seatingLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-caption text-ink-soft sm:col-span-2">
        Anything we should know (optional)
        <textarea name="message" rows={2} className={fieldClass} />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={status.kind === "sending"} className={buttonClass("primary", "disabled:opacity-60")}>
          {status.kind === "sending" ? "Sending…" : "Request a call back"}
        </button>
        {status.kind === "error" && (
          <p role="alert" className="text-caption text-bronze">
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
