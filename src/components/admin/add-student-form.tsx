"use client";
import { useActionState } from "react";
import { addStudent, type AddStudentState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";
import { examLabels, seatingLabels } from "@/lib/labels";

const inputClass = "mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert";

export function AddStudentForm() {
  const [state, action, pending] = useActionState<AddStudentState, FormData>(addStudent, {});
  const v = state.values ?? {};
  const err = (name: string) => state.fields?.[name]?.[0];

  return (
    <form action={action} className="max-w-3xl space-y-12">
      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-4 font-display text-h4">Student</legend>
        <Field error={err("fullName")} label="Full name">
          <input name="fullName" required defaultValue={v.fullName} aria-invalid={!!err("fullName")} className={inputClass} />
        </Field>
        <Field error={err("phone")} label="Mobile number">
          <input name="phone" type="tel" required defaultValue={v.phone} aria-invalid={!!err("phone")} className={inputClass} />
        </Field>
        <Field error={err("email")} label="Email (optional)">
          <input name="email" type="email" defaultValue={v.email} aria-invalid={!!err("email")} className={inputClass} />
        </Field>
        <Field error={err("examTarget")} label="Preparing for">
          <select name="examTarget" required defaultValue={v.examTarget ?? "mpsc_rajyaseva"} className={inputClass}>
            {Object.entries(examLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-4 font-display text-h4">Seat and fees</legend>
        <Field error={err("seating")} label="Seat">
          <select name="seating" required defaultValue={v.seating ?? "reserved"} className={inputClass}>
            {Object.entries(seatingLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field error={err("seatNumber")} label="Desk number (for a reserved desk)">
          <input name="seatNumber" defaultValue={v.seatNumber} placeholder="A-12" aria-invalid={!!err("seatNumber")} className={inputClass} />
        </Field>
        <Field error={err("months")} label="Months paid">
          <input name="months" type="number" min={1} max={12} defaultValue={v.months ?? "1"} aria-invalid={!!err("months")} className={inputClass} />
        </Field>
        <Field error={err("feeInr")} label="Monthly fee (₹)">
          <input name="feeInr" type="number" min={0} required defaultValue={v.feeInr} aria-invalid={!!err("feeInr")} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-4 font-display text-h4">Emergency contact</legend>
        <Field error={err("emergencyName")} label="Name">
          <input name="emergencyName" defaultValue={v.emergencyName} className={inputClass} />
        </Field>
        <Field error={err("emergencyPhone")} label="Mobile number">
          <input name="emergencyPhone" type="tel" defaultValue={v.emergencyPhone} aria-invalid={!!err("emergencyPhone")} className={inputClass} />
        </Field>
        <div className="md:col-span-2">
          <Field error={err("notes")} label="Notes (optional)">
            <textarea name="notes" rows={3} defaultValue={v.notes} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center gap-5">
        <button type="submit" disabled={pending} className={buttonClass("primary", "disabled:opacity-60")}>
          {pending ? "Adding…" : "Add student"}
        </button>
        {state.message && (
          <p role="alert" className="text-caption text-alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-caption text-ink-soft">
      {label}
      {children}
      {error && <span className="mt-1 block text-alert">{error}</span>}
    </label>
  );
}
