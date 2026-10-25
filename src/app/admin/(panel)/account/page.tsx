import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChangeEmailForm } from "@/components/admin/change-email-form";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { adminUser, requireAdmin } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  return (
    <>
      <h1 className="mb-2 font-display text-h3">Your account</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  await requireAdmin();
  const user = await adminUser();
  const changed = (await searchParams).changed;
  return (
    <>
      <p className="mb-10 text-ink-soft">{user ? `Signed in as ${user.email}.` : "Development mode: no sign-in."}</p>
      {user && (changed === "email" || changed === "password") && (
        <p role="status" className="mb-10 max-w-md border-l-2 border-ok bg-linen px-4 py-3 text-caption text-ink">
          {changed === "email"
            ? `Sign-in email changed. Use ${user.email} from now on; your password stays the same.`
            : "Password changed. Use the new one from now on."}{" "}
          Other devices have been signed out.
        </p>
      )}
      {user ? (
        <>
          <h2 className="mb-2 font-display text-h4">Change sign-in email</h2>
          <p className="mb-6 max-w-md text-caption text-ink-soft">
            Your password stays the same, and the old email stops working at once. Afterwards, also put the new email in ADMIN_EMAILS (in .env and on Vercel)
            to keep the settings tidy; access doesn’t depend on it.
          </p>
          <ChangeEmailForm />
          <h2 className="mt-14 mb-6 font-display text-h4">Change password</h2>
          <ChangePasswordForm />
        </>
      ) : (
        <p className="text-ink-soft">Email and password apply once sign-in is set up (ADMIN_EMAILS in .env).</p>
      )}
    </>
  );
}
