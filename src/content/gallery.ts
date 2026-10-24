import type { Photo } from "./images";
import imported from "./gallery-photos.json";

// Photos and video of Ekagra Library itself.
// To add photos: put them in photos-inbox/, run `npm run photos:import`,
// then give each new file a caption in `details` below.

export type GalleryItem =
  | { kind: "image"; id: string; caption: string; photo: Photo }
  | { kind: "video"; id: string; caption: string; src: string; poster: string; width: number; height: number; alt: string };

type Detail = { caption: string; alt: string };

// Order here is the order in the gallery. Files not listed are added at the end.
const details: Record<string, Detail> = {
  "/images/gallery/students-at-wall-desks.jpg": {
    caption: "Students at the wall desks",
    alt: "Students studying at wooden desks along a white wall with windows",
  },
  "/images/gallery/desks-by-the-windows.jpg": {
    caption: "Desks by the windows",
    alt: "A row of wooden study desks and chairs beneath bright windows",
  },
  "/images/gallery/hall-corner.jpg": {
    caption: "A corner of the hall",
    alt: "Study desks in a corner of the hall with a ceiling fan overhead",
  },
  "/images/gallery/reading-hall-long-view.jpg": {
    caption: "Looking down the hall",
    alt: "A long view of the hall with desks along both walls",
  },
};

const order = Object.keys(details);
const rank = (src: string) => (order.includes(src) ? order.indexOf(src) : order.length);

const photos: GalleryItem[] = [...imported]
  .sort((a, b) => rank(a.src) - rank(b.src))
  .map((p) => ({
    kind: "image",
    id: p.src,
    caption: details[p.src]?.caption ?? "Ekagra Library",
    photo: {
      src: p.src,
      width: p.width,
      height: p.height,
      alt: details[p.src]?.alt ?? "Inside Ekagra Library",
      credit: { author: "Ekagra Library", license: "All rights reserved", source: "" },
    },
  }));

const walkthrough: GalleryItem = {
  kind: "video",
  id: "/videos/reading-hall-walkthrough.mp4",
  caption: "A walk through the hall",
  src: "/videos/reading-hall-walkthrough.mp4",
  poster: "/images/gallery/reading-hall-walkthrough-poster.jpg",
  width: 360,
  height: 640,
  alt: "A short video walking through the reading hall past students at their desks",
};

export const gallery: GalleryItem[] = [walkthrough, ...photos];
