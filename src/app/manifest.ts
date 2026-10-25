import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}, ${site.area}, ${site.city}`,
    short_name: site.name,
    description: site.description,
    lang: "en-IN",
    start_url: "/",
    display: "browser",
    background_color: "#f8f5ef",
    theme_color: "#f8f5ef",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
