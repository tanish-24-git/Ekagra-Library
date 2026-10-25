"use client";
import { useEffect, useRef, useState } from "react";
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents";

// Picks a photo or PDF of an ID document. Photos are shrunk in the browser
// (longest side 1800px, JPEG) so a 5 MB phone photo uploads as ~300 KB.

const MAX_SIDE = 1800;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

type Props = {
  label: string;
  file?: File;
  onChange: (file: File | undefined) => void;
  serverError?: string;
  // The server response the error came from. Picking another file hides the
  // error until the next response.
  attempt: object;
};

export function DocumentInput({ label, file, onChange, serverError, attempt }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [dismissedFor, setDismissedFor] = useState<object>();

  // Free the preview's object URL when it's replaced or the field goes away.
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  async function pick(picked: File | undefined) {
    setError(undefined);
    setDismissedFor(attempt);
    if (!picked) return;
    if (!DOCUMENT_TYPES.includes(picked.type)) {
      setError("Upload a JPG, PNG, WebP or PDF file. iPhone HEIC photos: take a screenshot of the photo and upload that.");
      return;
    }
    setBusy(true);
    const ready = await shrink(picked);
    setBusy(false);
    if (ready.size > MAX_DOCUMENT_BYTES) {
      setError("This file is over 4 MB. Upload a smaller photo or PDF.");
      return;
    }
    setPreview(ready.type.startsWith("image/") ? URL.createObjectURL(ready) : undefined);
    onChange(ready);
  }

  function clear() {
    setDismissedFor(attempt);
    setPreview(undefined);
    onChange(undefined);
    if (input.current) input.current.value = "";
  }

  const shownError = error ?? (dismissedFor === attempt ? undefined : serverError);

  return (
    <div className="text-caption text-ink-soft">
      <span className="block">{label}</span>
      <div className="mt-1 flex min-h-28 items-center gap-4 border border-dashed border-rule bg-paper p-3">
        {file ? (
          <>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt={`${label} preview`} className="h-20 w-28 shrink-0 border border-rule object-cover" />
            ) : (
              <span className="grid h-20 w-28 shrink-0 place-items-center border border-rule text-ink">PDF</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{file.name}</span>
              <span className="block">{formatSize(file.size)}</span>
              <button type="button" onClick={clear} className="link-quiet mt-1 cursor-pointer text-ink">
                Remove
              </button>
            </span>
          </>
        ) : (
          <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-3 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bronze">
            <span className="text-body text-ink">{busy ? "Preparing photo…" : "Choose a photo or PDF"}</span>
            <span>JPG, PNG or PDF. Phone photos are shrunk before upload.</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => pick(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {shownError && <span className="mt-1 block text-alert">{shownError}</span>}
    </div>
  );
}
