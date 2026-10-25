import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { adminUser, requireAdmin } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-h3">Your account</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <Account />
      </Suspense>
    </>
  );
}

async function Account() {
  await connection();
  await requireAdmin();
  const user = await adminUser();
  return (
    <>
      <p className="mb-10 text-ink-soft">{user ? `Signed in as ${user.email}.` : "Development mode: no sign-in."}</p>
      <h2 className="mb-6 font-display text-h4">Change password</h2>
      {user ? (
        <ChangePasswordForm />
      ) : (
        <p className="text-ink-soft">Passwords apply once sign-in is set up (ADMIN_EMAILS in .env.local).</p>
      )}
    </>
  );
}
