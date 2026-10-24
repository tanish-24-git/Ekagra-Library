import Link from "next/link";
import { nav, site } from "@/content/site";

export function Footer() {
  return (
    <footer className="bg-sand">
      <div className="mx-auto max-w-[1440px] px-5 pt-20 pb-10 md:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="text-caption text-ink/75">Visit</h2>
            <address className="mt-3 not-italic">
              {site.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a href={site.phoneHref} className="link-quiet mt-3 inline-block">
              {site.phone}
            </a>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-caption text-ink/75">Hours</h2>
            <p className="mt-3">{site.hours}</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-4">
            <h2 className="text-caption text-ink/75">Pages</h2>
            <ul className="mt-3 space-y-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-quiet">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/credits" className="link-quiet">
                  Photo credits
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p
          aria-hidden
          className="mt-20 font-display text-[clamp(3.25rem,13.5vw,13rem)] leading-[0.9] tracking-[-0.02em] text-taupe"
        >
          {site.name}
        </p>

        <div className="mt-8 flex flex-col gap-3 border-t border-ink/15 pt-6 text-caption text-ink/75 md:flex-row md:justify-between">
          <span>
            © {site.copyrightYear} {site.fullName}
            <span lang="mr" className="ml-3">
              {site.marathiName}
            </span>
          </span>
          <a href="#top" className="link-quiet">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
