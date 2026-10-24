"use client";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-10 space-y-6">
      <label className="block text-caption text-ink-soft">
        Password
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "login-error" : undefined}
          className="mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2.5 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert"
        />
      </label>
      {state.error && (
        <p id="login-error" role="alert" className="text-caption text-alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full disabled:opacity-60")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
