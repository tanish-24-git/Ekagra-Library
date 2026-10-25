"use client";
import { useState } from "react";
import { aadhaarError, formatAadhaar, licenceError, normalizeLicence, normalizePan, panError } from "@/lib/id-numbers";

// Aadhaar and PAN fields that format themselves while you type: Aadhaar in
// groups of four, PAN in capitals with spaces removed. No Caps Lock needed.
// The server error shows until the field is edited and left again.

type Props = { defaultValue?: string; serverError?: string; className: string; hint?: string };

export function AadhaarInput({ defaultValue = "", serverError, className, hint }: Props) {
  const [value, setValue] = useState(() => formatAadhaar(defaultValue));
  const [left, setLeft] = useState(false);
  const error = left ? aadhaarError(value) : serverError;
  return (
    <label className="block text-caption text-ink-soft">
      Aadhaar number
      <input
        name="aadhaar"
        value={value}
        onChange={(e) => setValue(formatAadhaar(e.target.value))}
        onBlur={() => setLeft(true)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="1234 5678 9012"
        maxLength={16}
        aria-invalid={!!error}
        className={`${className} tabular-nums tracking-wide`}
      />
      {error ? <span className="mt-1 block text-alert">{error}</span> : hint && <span className="mt-1 block">{hint}</span>}
    </label>
  );
}

export function PanInput({ defaultValue = "", serverError, className, hint }: Props) {
  const [value, setValue] = useState(() => normalizePan(defaultValue));
  const [left, setLeft] = useState(false);
  const error = left ? panError(value) : serverError;
  return (
    <label className="block text-caption text-ink-soft">
      PAN number
      <input
        name="pan"
        value={value}
        onChange={(e) => setValue(normalizePan(e.target.value))}
        onBlur={() => setLeft(true)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="ABCDE1234F"
        maxLength={14}
        aria-invalid={!!error}
        className={`${className} tracking-wide`}
      />
      {error ? <span className="mt-1 block text-alert">{error}</span> : hint && <span className="mt-1 block">{hint}</span>}
    </label>
  );
}

export function LicenceInput({ defaultValue = "", serverError, className, hint }: Props) {
  const [value, setValue] = useState(() => normalizeLicence(defaultValue));
  const [left, setLeft] = useState(false);
  const error = left ? licenceError(value) : serverError;
  return (
    <label className="block text-caption text-ink-soft">
      Driving licence number
      <input
        name="licence"
        value={value}
        onChange={(e) => setValue(normalizeLicence(e.target.value))}
        onBlur={() => setLeft(true)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="MH1220110012345"
        maxLength={24}
        aria-invalid={!!error}
        className={`${className} tracking-wide`}
      />
      {error ? <span className="mt-1 block text-alert">{error}</span> : hint && <span className="mt-1 block">{hint}</span>}
    </label>
  );
}
