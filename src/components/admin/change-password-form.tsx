"use client";
import { useActionState } from "react";
import { changeAdminPassword, type PasswordState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";

const inputClass = "mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changeAdminPassword, {});
  return (
    <form action={action} className="max-w-md space-y-6">
      <label className="block text-caption text-ink-soft">
        Current password
        <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      <label className="block text-caption text-ink-soft">
        New password (at least 8 characters; longer is safer)
        <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="block text-caption text-ink-soft">
        New password again
        <input name="repeatPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      {state.error && (
        <p role="alert" className="text-caption text-alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "disabled:opacity-60")}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
