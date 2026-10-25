import type { MetadataRoute } from "next";
import { gallery } from "@/content/gallery";
import { photos } from "@/content/images";
import { seo } from "@/content/site";
import { absoluteUrl } from "@/lib/site-url";

// Public pages with their images and video, so they can show up in image and
// video search too. Bump seo.updated in src/content/site.ts after big changes.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: seo.updated,
      changeFrequency: "monthly",
      priority: 1,
      images: Object.values(photos).map((p) => absoluteUrl(p.src)),
    },
    {
      url: absoluteUrl("/gallery"),
      lastModified: seo.updated,
      changeFrequency: "monthly",
      priority: 0.8,
      images: gallery.flatMap((item) => (item.kind === "image" ? [absoluteUrl(item.photo.src)] : [])),
      videos: gallery.flatMap((item) =>
        item.kind === "video"
          ? [
              {
                title: item.caption,
                description: item.alt,
                thumbnail_loc: absoluteUrl(item.poster),
                content_loc: absoluteUrl(item.src),
                publication_date: seo.updated,
              },
            ]
          : [],
      ),
    },
  ];
}
