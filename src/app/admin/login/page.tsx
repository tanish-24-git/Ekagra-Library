import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-5">
      <p className="font-display text-h4">{site.name}</p>
      <h1 className="mt-1 text-ink-soft">Sign in to the admin</h1>
      <LoginForm />
    </main>
  );
}
