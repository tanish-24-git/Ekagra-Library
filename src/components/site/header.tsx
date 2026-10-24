"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { nav, site } from "@/content/site";
import { cn } from "@/lib/cn";

export function Header() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));
  // Close the menu after navigating (including back/forward).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-500 ease-quiet",
        scrolled || open ? "bg-paper/90 shadow-[0_1px_0_var(--color-rule)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link href="/" className="font-display text-[1.375rem] leading-none tracking-[-0.01em]" aria-label={`${site.name}, home`}>
          {site.name}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="link-quiet text-body no-underline hover:underline">
              {item.label}
            </Link>
          ))}
          <Link href="/#visit" className={buttonClass("primary", "py-2.5")}>
            Ask about a seat
          </Link>
        </nav>

        <button
          type="button"
          className="-mr-2 flex h-11 items-center gap-2 px-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-body">{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[72px] bottom-0 flex flex-col justify-between bg-paper px-5 pt-8 pb-10 md:hidden"
          >
            <ul className="space-y-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)} className="block py-2 font-display text-h3">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="space-y-4">
              <Link href="/#visit" onClick={() => setOpen(false)} className={buttonClass("primary", "w-full")}>
                Ask about a seat
              </Link>
              <a href={site.phoneHref} className="block text-center text-ink-soft">
                Call {site.phone}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
