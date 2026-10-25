"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { z } from "zod";
import { buttonClass } from "@/components/ui/button";
import { enquirySchema, type EnquiryField } from "@/lib/enquiry";
import { submitEnquiry } from "@/app/(site)/actions";
import { cn } from "@/lib/cn";
import { ExamSelect } from "./exam-select";

type Values = Record<EnquiryField, string>;
type Errors = Partial<Record<EnquiryField, string>>;

const EMPTY: Values = { name: "", phone: "", preparingFor: "", reason: "" };
const ORDER: EnquiryField[] = ["name", "phone", "preparingFor", "reason"];
const EXAMS = ["MPSC", "UPSC", "NEET", "JEE", "Banking", "SSC", "Police Bharti"];
const OTHER = "Other";
const REASON_MAX = 500;

function check(values: Values): Errors {
  const result = enquirySchema.safeParse(values);
  if (result.success) return {};
  const fields = z.flattenError(result.error).fieldErrors as Partial<Record<EnquiryField, string[]>>;
  return Object.fromEntries(ORDER.filter((k) => fields[k]?.length).map((k) => [k, fields[k]![0]]));
}

// Chosen exams plus the "Other" text, e.g. "MPSC, UPSC, CA Foundation".
const combineExams = (chosen: string[], other: string) =>
  [...chosen.filter((e) => e !== OTHER), chosen.includes(OTHER) ? other.trim() : ""].filter(Boolean).join(", ");

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(-10);
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const fieldClass =
  "mt-2 block w-full border-0 border-b border-rule bg-transparent px-0 py-2.5 text-body text-ink placeholder:text-ink-soft/70 focus:border-ink focus:shadow-[0_1px_0_0_var(--color-ink)] focus:outline-none aria-[invalid=true]:border-alert";

export function EnquiryForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<EnquiryField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [refusal, setRefusal] = useState<string>();
  const [sent, setSent] = useState<{ name: string; phone: string } | null>(null);
  const [exams, setExams] = useState<string[]>([]);

  // values.preparingFor holds only the "Other" text; the payload merges in the chosen exams.
  const payload: Values = { ...values, preparingFor: combineExams(exams, values.preparingFor) };

  // Errors show once a field has been left (or on submit), then update as you type.
  const errors = check(payload);
  const errorFor = (k: EnquiryField) => (touched[k] ? errors[k] : undefined) ?? serverErrors[k];

  const field = (k: EnquiryField) => ({
    name: k,
    id: `enquiry-${k}`,
    value: values[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [k]: e.target.value }));
      setServerErrors((s) => ({ ...s, [k]: undefined }));
    },
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    "aria-invalid": !!errorFor(k),
    "aria-describedby": errorFor(k) ? `enquiry-${k}-error` : undefined,
  });

  const toggleExam = (exam: string) => {
    const adding = !exams.includes(exam);
    setExams((list) => (adding ? [...list, exam] : list.filter((e) => e !== exam)));
    if (adding && exam === OTHER) setTimeout(() => document.getElementById("enquiry-preparingFor")?.focus(), 80);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched({ name: true, phone: true, preparingFor: true, reason: true });
    const firstInvalid = ORDER.find((k) => errors[k]);
    if (firstInvalid) {
      document.getElementById(`enquiry-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("sending");
    const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value;
    const result = await submitEnquiry({ ...payload, company }).catch(() => null);

    if (result?.ok) {
      setSent({ name: values.name.trim().split(/\s+/)[0], phone: formatPhone(values.phone) });
      setStatus("idle");
      return;
    }
    const fields = (result && !result.ok && result.fields) || {};
    setServerErrors(Object.fromEntries(ORDER.filter((k) => fields[k]?.length).map((k) => [k, fields[k]![0]])));
    setRefusal(result && !result.ok ? result.error : undefined);
    setStatus("error");
  }

  if (sent) {
    return (
      <div role="status" className="border-t border-ink pt-8">
        <p className="font-display text-h3">Enquiry sent.</p>
        <p className="mt-3 max-w-[44ch] text-ink-soft">
          Thanks, {sent.name}. We’ll call you on {sent.phone} soon.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setValues(EMPTY);
            setExams([]);
            setTouched({});
          }}
          className="link-quiet mt-6"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-8 [--field-bg:var(--color-linen)] sm:grid-cols-2">
      <div>
        <label htmlFor="enquiry-name" className="block text-caption text-ink-soft">
          Your name
        </label>
        <input {...field("name")} required autoComplete="name" maxLength={60} className={fieldClass} />
        <FieldError id="enquiry-name-error" message={errorFor("name")} />
      </div>

      <div>
        <label htmlFor="enquiry-phone" className="block text-caption text-ink-soft">
          Mobile number
        </label>
        <input {...field("phone")} required type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="98765 43210" className={fieldClass} />
        <FieldError id="enquiry-phone-error" message={errorFor("phone")} />
      </div>

      <div className="sm:col-span-2">
        <span id="enquiry-exams-label" className="block text-caption text-ink-soft">
          What are you preparing for? <span className="text-ink-soft/80">(optional, choose any)</span>
        </span>
        <ExamSelect
          id="enquiry-exams"
          labelId="enquiry-exams-label"
          options={[...EXAMS, OTHER]}
          selected={exams}
          onToggle={toggleExam}
          placeholder="Choose one or more"
        />
        <AnimatePresence initial={false}>
          {exams.includes(OTHER) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <label htmlFor="enquiry-preparingFor" className="mt-6 block text-caption text-ink-soft">
                Which exam?
              </label>
              <input {...field("preparingFor")} maxLength={60} placeholder="For example: CA Foundation, TET or college exams" className={fieldClass} />
            </motion.div>
          )}
        </AnimatePresence>
        <FieldError id="enquiry-preparingFor-error" message={errorFor("preparingFor")} />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="enquiry-reason" className="block text-caption text-ink-soft">
          Why do you want to join? <span className="text-ink-soft/80">(optional)</span>
        </label>
        <textarea
          {...field("reason")}
          rows={3}
          maxLength={REASON_MAX}
          placeholder="For example: I need a quiet place to study after college."
          className={cn(fieldClass, "resize-none")}
        />
        <div className="mt-1 flex justify-between gap-4">
          <FieldError id="enquiry-reason-error" message={errorFor("reason")} />
          <span className="ml-auto text-caption text-ink-soft tabular-nums">
            {values.reason.length}/{REASON_MAX}
          </span>
        </div>
      </div>

      {/* Hidden from people; spam bots fill it in and get quietly ignored. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={status === "sending"} className={buttonClass("primary", "disabled:opacity-60")}>
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </button>
        {status === "error" && (
          <p role="alert" className="text-caption text-alert">
            {refusal ??
              (Object.values(serverErrors).some(Boolean)
                ? "Check the highlighted fields and send again."
                : "Couldn’t send your enquiry. Check your connection and try again, or call us.")}
          </p>
        )}
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-caption text-alert">
      {message}
    </p>
  );
}
