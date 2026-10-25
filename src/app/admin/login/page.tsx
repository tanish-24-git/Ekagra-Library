import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { site } from "@/content/site";
import { isAdmin } from "@/lib/admin-guard";
import { adminHref } from "@/lib/admin-session";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-5">
      <p className="font-display text-h4">{site.name}</p>
      <h1 className="mt-1 text-ink-soft">Sign in to the admin</h1>
      <Suspense fallback={<p className="mt-10 text-ink-soft">Loading…</p>}>
        <LoginGate />
      </Suspense>
    </main>
  );
}

// Admins go straight in; anyone else gets the form.
async function LoginGate() {
  await connection();
  if (await isAdmin()) redirect(adminHref());
  const session = auth ? (await auth.getSession()).data : null;
  return <LoginForm signedInAs={session?.user?.email} returnTo={adminHref("/login")} />;
}
