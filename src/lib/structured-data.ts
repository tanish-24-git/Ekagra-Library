import type { GalleryItem } from "@/content/gallery";
import { photos } from "@/content/images";
import { amenities, exams, faqs, seo, site } from "@/content/site";
import { absoluteUrl, siteUrl } from "./site-url";

// schema.org descriptions of the library for search engines and AI answer
// engines. Rendered as JSON-LD by <JsonLd>. Validate changes with
// https://validator.schema.org and https://search.google.com/test/rich-results.

const libraryId = `${siteUrl}/#library`;
const websiteId = `${siteUrl}/#website`;
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function libraryJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Library",
    "@id": libraryId,
    name: site.name,
    alternateName: [site.marathiName, "Ekagra Abhyasika"],
    description: site.description,
    url: siteUrl,
    telephone: "+91-7057889881",
    image: [absoluteUrl(photos.readingHall.src)],
    address: { "@type": "PostalAddress", ...site.postalAddress },
    geo: { "@type": "GeoCoordinates", ...site.geo },
    hasMap: site.mapsUrl,
    sameAs: [site.mapsUrl],
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: site.opens, closes: site.closes },
    ],
    amenityFeature: amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.title, description: a.body, value: true })),
    areaServed: [
      { "@type": "Place", name: `${site.area}, ${site.city}` },
      { "@type": "City", name: site.city },
    ],
    knowsAbout: [...exams.slice(0, 4), "Competitive exam preparation"],
    keywords: seo.keywords.join(", "),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: site.name,
    alternateName: site.marathiName,
    url: siteUrl,
    inLanguage: "en-IN",
    publisher: { "@id": libraryId },
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    about: { "@id": libraryId },
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
  };
}

export function galleryJsonLd(items: GalleryItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${siteUrl}/gallery#gallery`,
    name: `Photos of ${site.name}, ${site.area}, ${site.city}`,
    url: absoluteUrl("/gallery"),
    about: { "@id": libraryId },
    associatedMedia: items.map((item) =>
      item.kind === "video"
        ? {
            "@type": "VideoObject",
            name: item.caption,
            description: item.alt,
            contentUrl: absoluteUrl(item.src),
            thumbnailUrl: absoluteUrl(item.poster),
            uploadDate: seo.updated,
            contentLocation: { "@id": libraryId },
          }
        : {
            "@type": "ImageObject",
            name: item.caption,
            caption: item.photo.alt,
            contentUrl: absoluteUrl(item.photo.src),
            width: item.photo.width,
            height: item.photo.height,
            contentLocation: { "@id": libraryId },
          },
    ),
  };
}
