import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Set up the admin" };

// Shown at /admin in development when a real database is connected but
// sign-in isn't set up. Contains no data. On the live site /admin is a 404.
export default function AdminSetupPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-5">
      <p className="font-display text-h4">{site.name}</p>
      <h1 className="mt-1 text-ink-soft">The admin needs a sign-in</h1>
      <p className="mt-8">
        The site is connected to your Neon database, so the admin won’t open without a login. To set it up:
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5">
        <li>
          Open <code className="rounded bg-linen px-1.5 py-0.5 text-caption">.env.local</code> in the project folder.
        </li>
        <li>
          Put your email after <code className="rounded bg-linen px-1.5 py-0.5 text-caption">ADMIN_EMAILS=</code>, for example{" "}
          <code className="rounded bg-linen px-1.5 py-0.5 text-caption">ADMIN_EMAILS=you@gmail.com</code>, and save. Add more people with commas.
        </li>
        <li>
          Reload this page. It turns into the login page: choose <strong>Create your admin account</strong>, or <strong>Continue with Google</strong>{" "}
          with that address.
        </li>
      </ol>
      <p className="mt-8 text-caption text-ink-soft">This page only appears while developing. On the live site, /admin answers “not found” until sign-in is set up.</p>
    </main>
  );
}
