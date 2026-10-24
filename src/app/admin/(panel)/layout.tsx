import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { site } from "@/content/site";
import { adminHref } from "@/lib/admin-session";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { href: adminHref(), label: "Students" },
    { href: adminHref("/students/new"), label: "Add student" },
    { href: adminHref("/enquiries"), label: "Enquiries" },
  ];

  return (
    <>
      <header className="border-b border-rule bg-linen">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-baseline gap-3">
            <Link href={adminHref()} className="font-display text-[1.25rem]">
              {site.name}
            </Link>
            <span className="text-caption text-ink-soft">Admin</span>
          </div>
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-x-6 gap-y-1 text-body">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="link-quiet">
                {l.label}
              </Link>
            ))}
            <form action={logout}>
              <button type="submit" className="text-ink-soft hover:text-ink">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 py-10 md:px-8 md:py-14">{children}</main>
    </>
  );
}
