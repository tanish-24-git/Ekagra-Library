"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { addStudent, editStudent, type StudentFormState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";
import type { DocumentKind } from "@/db/schema";
import { DOCUMENT_KINDS, documentLabels } from "@/lib/documents";
import { maskAadhaar, maskLicence, maskPan } from "@/lib/id-numbers";
import { examLabels, paymentModeLabels, seatingLabels } from "@/lib/labels";
import { DocumentInput } from "./document-input";
import { AadhaarInput, LicenceInput, PanInput } from "./id-number-inputs";

const inputClass = "mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert";

type Saved = { aadhaarLast4: string | null; panLast4: string | null; licenceLast4: string | null; documents: DocumentKind[] };
// `today` comes from the server so the joining date defaults to it without
// the form reading the clock while rendering.
type Props =
  | { mode: "create"; today: string; initial?: Record<string, string>; formFiles?: string[] }
  | { mode: "edit"; today: string; studentId: string; initial: Record<string, string>; saved: Saved; cancelHref: string };

// Adding a student (with the first payment) and editing one share this form.
// When editing, blank ID numbers and empty document slots keep what's saved.
export function StudentForm(props: Props) {
  const editing = props.mode === "edit";
  const [state, action, pending] = useActionState<StudentFormState, FormData>(
    editing ? editStudent.bind(null, props.studentId) : addStudent,
    {},
  );
  const [files, setFiles] = useState<Partial<Record<DocumentKind, File>>>({});
  const v = state.values ?? props.initial ?? {};
  const formFiles = !editing ? props.formFiles : undefined;
  const saved = editing ? props.saved : undefined;
  const err = (name: string) => state.fields?.[name]?.[0];

  // Submitted by hand rather than through `action`, so the chosen files and
  // typed values stay put if the server sends the form back with errors.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    for (const kind of DOCUMENT_KINDS) {
      const file = files[kind];
      if (file) data.set(`doc_${kind}`, file);
    }
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-12">
      {v.intakeId && (
        <>
          <input type="hidden" name="intakeId" value={v.intakeId} />
          <p className="border-l-2 border-bronze bg-linen px-4 py-3 text-caption text-ink">
            Filled in from a Google Form registration. Check the details, choose the seat and fee, then add the student.
            {formFiles?.length ? ` The form’s files (${formFiles.join(", ")}) are attached automatically unless you upload a replacement below.` : ""}
          </p>
        </>
      )}
      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-4 font-display text-h4">Student</legend>
        <Field error={err("fullName")} label="Full name">
          <input name="fullName" required defaultValue={v.fullName} aria-invalid={!!err("fullName")} className={inputClass} />
        </Field>
        <Field error={err("phone")} label="Primary mobile number">
          <input name="phone" type="tel" required defaultValue={v.phone} aria-invalid={!!err("phone")} className={inputClass} />
        </Field>
        <Field error={err("secondaryPhone")} label="Secondary mobile number (optional)">
          <input name="secondaryPhone" type="tel" defaultValue={v.secondaryPhone} aria-invalid={!!err("secondaryPhone")} className={inputClass} />
        </Field>
        <Field error={err("email")} label="Email (optional, for fee reminders)">
          <input name="email" type="email" defaultValue={v.email} aria-invalid={!!err("email")} className={inputClass} />
        </Field>
        <Field error={err("occupation")} label="Studying or working in (optional)">
          <input name="occupation" defaultValue={v.occupation} placeholder="BSc at Pune University, or software engineer" aria-invalid={!!err("occupation")} className={inputClass} />
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
        <Field error={err("joinedOn")} label="Joined on">
          <input name="joinedOn" type="date" required defaultValue={v.joinedOn ?? props.today} max={props.today} aria-invalid={!!err("joinedOn")} className={inputClass} />
        </Field>
        <div className="md:col-span-2">
          <Field error={err("address")} label="Address (optional)">
            <textarea name="address" rows={2} defaultValue={v.address} aria-invalid={!!err("address")} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-4 font-display text-h4">{editing ? "Seat and monthly fee" : "Seat and fees"}</legend>
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
        {!editing && (
          <>
            <Field error={err("months")} label="Months paid">
              <input name="months" type="number" min={1} max={12} defaultValue={v.months ?? "1"} aria-invalid={!!err("months")} className={inputClass} />
            </Field>
            <Field error={err("paymentMode")} label="Paid by">
              <select name="paymentMode" defaultValue={v.paymentMode ?? "cash"} className={inputClass}>
                {Object.entries(paymentModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field error={err("feeInr")} label="Monthly fee (₹)">
          <input name="feeInr" type="number" min={0} required defaultValue={v.feeInr} aria-invalid={!!err("feeInr")} className={inputClass} />
        </Field>
        {editing && <p className="self-end text-caption text-ink-soft">Payments and new months go through Renew on the student page.</p>}
      </fieldset>

      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="mb-1 font-display text-h4">ID documents</legend>
        <p className="-mt-2 text-caption text-ink-soft md:col-span-2">
          {editing
            ? "Leave a number blank to keep the saved one. A new file replaces the saved one of the same kind."
            : "All optional: skip anything you don’t have yet and add it later with Edit. Numbers and files are encrypted, and the admin shows only the last four characters until you ask to see them."}
        </p>
        <AadhaarInput
          defaultValue={v.aadhaar}
          serverError={err("aadhaar")}
          className={inputClass}
          hint={saved?.aadhaarLast4 ? `Saved: ${maskAadhaar(saved.aadhaarLast4)}` : undefined}
        />
        <PanInput
          defaultValue={v.pan}
          serverError={err("pan")}
          className={inputClass}
          hint={saved?.panLast4 ? `Saved: ${maskPan(saved.panLast4)}` : undefined}
        />
        <LicenceInput
          defaultValue={v.licence}
          serverError={err("licence")}
          className={inputClass}
          hint={saved?.licenceLast4 ? `Saved: ${maskLicence(saved.licenceLast4)}` : undefined}
        />
        <div className="grid gap-6 md:col-span-2 md:grid-cols-2">
          {DOCUMENT_KINDS.map((kind) => (
            <DocumentInput
              key={kind}
              label={saved?.documents.includes(kind) ? `${documentLabels[kind]} (saved; upload to replace)` : documentLabels[kind]}
              file={files[kind]}
              onChange={(file) => setFiles((f) => ({ ...f, [kind]: file }))}
              serverError={err(`doc_${kind}`)}
              attempt={state}
            />
          ))}
        </div>
        <label className="flex items-start gap-3 text-caption text-ink md:col-span-2">
          <input type="checkbox" name="consent" defaultChecked={v.consent === "on"} className="mt-1 size-4 accent-ink" />
          <span>
            The student agreed to share these ID details for admission and safety records. (Only needed if you add an ID.)
            {err("consent") && <span className="mt-1 block text-alert">{err("consent")}</span>}
          </span>
        </label>
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

      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" disabled={pending} className={buttonClass("primary", "disabled:opacity-60")}>
          {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Adding…" : "Add student"}
        </button>
        {editing && (
          <Link href={props.cancelHref} className="link-quiet">
            Cancel
          </Link>
        )}
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
