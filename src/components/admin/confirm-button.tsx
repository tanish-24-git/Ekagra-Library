"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

// A button that asks once more before doing something you can't undo.
// `action` is a Server Action (bound to its arguments).
export function ConfirmButton({
  action,
  label,
  confirm,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={cn("link-quiet cursor-pointer", className)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-caption text-ink">{confirm}</span>
      <Submit />
      <button type="button" onClick={() => setAsking(false)} className="link-quiet cursor-pointer text-caption">
        Cancel
      </button>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="cursor-pointer text-caption font-medium text-alert underline underline-offset-4 disabled:opacity-60">
      {pending ? "Working…" : "Yes, do it"}
    </button>
  );
}
