"use client";
import { useActionState, useState } from "react";
import { renewMembership, type RenewState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";
import { paymentModeLabels } from "@/lib/labels";

const inputClass = "mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert";

// Records a renewal payment. The amount follows the months chosen until you
// type your own (for a discount, say).
export function RenewForm({ studentId, monthlyFee }: { studentId: string; monthlyFee: number }) {
  const [state, action, pending] = useActionState<RenewState, FormData>(renewMembership.bind(null, studentId), {});
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState<string>();
  const err = (name: string) => state.fields?.[name]?.[0];

  return (
    <form action={action} className="grid max-w-2xl gap-5 sm:grid-cols-3">
      <label className="block text-caption text-ink-soft">
        Months paid
        <input
          name="months"
          type="number"
          min={1}
          max={12}
          value={months}
          onChange={(e) => setMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
          aria-invalid={!!err("months")}
          className={inputClass}
        />
      </label>
      <label className="block text-caption text-ink-soft">
        Amount (₹)
        <input
          name="amountInr"
          type="number"
          min={0}
          value={amount ?? String(monthlyFee * months)}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!!err("amountInr")}
          className={inputClass}
        />
      </label>
      <label className="block text-caption text-ink-soft">
        Paid by
        <select name="mode" defaultValue="cash" className={inputClass}>
          {Object.entries(paymentModeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-5 sm:col-span-3">
        <button type="submit" disabled={pending} className={buttonClass("primary", "disabled:opacity-60")}>
          {pending ? "Saving…" : "Record payment and renew"}
        </button>
        {state.message && (
          <p role="status" className="text-caption text-ok">
            {state.message}
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-caption text-alert">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
