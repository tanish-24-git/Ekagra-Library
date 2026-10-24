import type { Metadata } from "next";
import { allPhotos } from "@/content/images";

export const metadata: Metadata = {
  title: "Photo credits",
  robots: { index: false },
};

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-36 pb-32 md:px-10 md:pt-48">
      <h1 className="font-display text-h2 tracking-[-0.015em]">Photo credits</h1>
      <p className="mt-5 max-w-[56ch] text-ink-soft">
        Some photographs on this site are from Wikimedia Commons and are used under the licences below.
      </p>
      <ul className="mt-12 max-w-3xl">
        {allPhotos.map((p) => (
          <li key={p.src} className="border-t border-rule py-5 last:border-b">
            <p>{p.alt}</p>
            <p className="mt-1 text-caption text-ink-soft">
              {p.credit.author}, {p.credit.license}.{" "}
              <a href={p.credit.source} target="_blank" rel="noreferrer" className="link-quiet">
                Source
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
