import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { gallery } from "@/content/gallery";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: `Photos of the reading hall at ${site.fullName}, Yerawada, Pune.`,
};

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-36 md:px-10 md:pt-48">
      <header className="grid gap-6 pb-20 md:grid-cols-12 md:gap-6 md:pb-28">
        <h1 className="font-display text-h1 tracking-[-0.02em] md:col-span-6">Gallery</h1>
        <p className="max-w-[40ch] text-lead text-ink-soft md:col-span-5 md:col-start-8 md:self-end">
          The library as it is on an ordinary day. Select a photo or the video to see it full size.
        </p>
      </header>
      <GalleryView items={gallery} />
    </div>
  );
}
