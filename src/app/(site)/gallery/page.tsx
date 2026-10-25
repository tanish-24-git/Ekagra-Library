import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { JsonLd } from "@/components/seo/json-ld";
import { gallery } from "@/content/gallery";
import { photos } from "@/content/images";
import { site } from "@/content/site";
import { breadcrumbJsonLd, galleryJsonLd } from "@/lib/structured-data";

const title = `Photos of Our Study Library in ${site.area}, ${site.city}`;
const description = `See the reading hall, the desks by the windows and a walkthrough video of ${site.name}, a study library in Kutwal Colony, ${site.area}, ${site.city}.`;
const shareImage = { url: photos.readingHall.src, width: photos.readingHall.width, height: photos.readingHall.height, alt: photos.readingHall.alt };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/gallery" },
  openGraph: {
    siteName: site.name,
    title: `${title} | ${site.name}`,
    description,
    url: "/gallery",
    images: [shareImage],
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: `${title} | ${site.name}`, description, images: [shareImage] },
};

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-36 md:px-10 md:pt-48">
      <header className="grid gap-6 pb-20 md:grid-cols-12 md:gap-6 md:pb-28">
        <h1 className="md:col-span-6">
          <span className="block text-body text-ink-soft">
            {site.name}, {site.area}, {site.city}
          </span>{" "}
          <span className="mt-3 block font-display text-h1 tracking-[-0.02em]">Gallery</span>
        </h1>
        <p className="max-w-[40ch] text-lead text-ink-soft md:col-span-5 md:col-start-8 md:self-end">
          Photos and a walkthrough video of our reading hall in {site.area}, as it is on an ordinary day. Select a photo or the video to see it
          full size.
        </p>
      </header>
      <GalleryView items={gallery} />
      <JsonLd
        id="breadcrumb"
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ])}
      />
      <JsonLd id="gallery" data={galleryJsonLd(gallery)} />
    </div>
  );
}
