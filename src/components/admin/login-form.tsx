"use client";
import { createAuthClient } from "@neondatabase/auth/next";
import { useActionState, useState } from "react";
import { createAdminAccount, logout, signIn, type LoginState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/button";

const inputClass =
  "mt-1 block w-full rounded-none border border-rule bg-paper px-3 py-2.5 text-body text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-alert";

// Talks to Neon Auth through /api/auth on this site.
const authClient = createAuthClient();

// Sign in with Google or email, or (first time) create the admin account for
// an allowed email. Google returns to `returnTo` (the login page), which
// sends admins on to the admin and shows everyone else who they're signed in as.
export function LoginForm({ signedInAs, returnTo }: { signedInAs?: string; returnTo: string }) {
  const [creating, setCreating] = useState(false);
  const [googleError, setGoogleError] = useState<string>();
  const [googlePending, setGooglePending] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState<LoginState, FormData>(signIn, {});
  const [createState, createAction, creatingNow] = useActionState<LoginState, FormData>(createAdminAccount, {});
  const state = creating ? createState : signInState;
  const pending = creating ? creatingNow : signingIn;

  async function continueWithGoogle() {
    setGoogleError(undefined);
    setGooglePending(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: returnTo });
    if (error) {
      setGooglePending(false);
      setGoogleError(`Google sign-in didn’t start: ${error.message ?? "unknown error"}. Use email and password instead.`);
    }
  }

  return (
    <>
      {signedInAs && (
        <div className="mt-8 border border-rule bg-linen p-4 text-caption text-ink">
          You’re signed in as {signedInAs}, which isn’t an admin account.
          <form action={logout} className="mt-2">
            <button type="submit" className="link-quiet cursor-pointer">
              Sign out
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={googlePending}
        className="mt-10 flex w-full cursor-pointer items-center justify-center gap-3 border border-rule bg-paper px-4 py-2.5 text-body text-ink transition-colors hover:border-ink disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.3-4.7 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </button>
      {googleError && (
        <p role="alert" className="mt-2 text-caption text-alert">
          {googleError}
        </p>
      )}
      <p className="mt-6 flex items-center gap-3 text-caption text-ink-soft before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">
        or with email
      </p>

      <form action={creating ? createAction : signInAction} className="mt-6 space-y-6" key={creating ? "create" : "sign-in"}>
        {creating && (
          <label className="block text-caption text-ink-soft">
            Your name
            <input name="name" autoComplete="name" defaultValue={state.name} className={inputClass} />
          </label>
        )}
        <label className="block text-caption text-ink-soft">
          Email
          <input name="email" type="email" required autoFocus autoComplete="email" defaultValue={state.email} aria-invalid={!!state.error} className={inputClass} />
        </label>
        <label className="block text-caption text-ink-soft">
          {creating ? "Choose a password (at least 10 characters)" : "Password"}
          <input
            name="password"
            type="password"
            required
            minLength={creating ? 10 : undefined}
            autoComplete={creating ? "new-password" : "current-password"}
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "login-error" : undefined}
            className={inputClass}
          />
        </label>
        {state.error && (
          <p id="login-error" role="alert" className="text-caption text-alert">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-caption text-ok">
            {state.notice}
          </p>
        )}
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full disabled:opacity-60")}>
          {creating ? (pending ? "Creating account…" : "Create admin account") : pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-caption text-ink-soft">
        {creating ? "Already have an account? " : "First time here? "}
        <button type="button" onClick={() => setCreating(!creating)} className="link-quiet cursor-pointer text-ink">
          {creating ? "Sign in" : "Create your admin account"}
        </button>
      </p>
    </>
  );
}
