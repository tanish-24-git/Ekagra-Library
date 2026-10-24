"use client";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AmbientVideo } from "@/components/ui/ambient-video";
import type { GalleryItem } from "@/content/gallery";
import { cn } from "@/lib/cn";

// Photos and video of the library in an asymmetric grid. Selecting one opens
// it full screen; arrow keys move between items.
export function GalleryView({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = items.length;

  const show = (index: number) => {
    setOpen(index);
    dialog.current?.showModal();
  };
  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + count) % count));

  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (delta) setOpen((i) => (i === null ? i : (i + delta + count) % count));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, count]);

  const current = open === null ? null : items[open];
  const plate = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <ul className="grid grid-flow-dense grid-cols-2 items-start gap-x-4 gap-y-10 border-t border-rule pt-10 pb-28 md:grid-cols-12 md:gap-x-6 md:gap-y-14 md:pb-36">
        {items.map((item, index) => (
          <li key={item.id} className={tileSpan(item)}>
            <button
              type="button"
              onClick={() => show(index)}
              className="group block w-full text-left"
              aria-label={`${item.kind === "video" ? "Play video" : "Open photo"}: ${item.caption}`}
            >
              <span className={cn("relative block overflow-hidden bg-sand", tileAspect(item))}>
                {item.kind === "video" ? (
                  <AmbientVideo src={item.src} poster={item.poster} />
                ) : (
                  <Image
                    src={item.photo.src}
                    alt={item.photo.alt}
                    fill
                    sizes={item.photo.width >= 1200 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                    className="object-cover transition-transform duration-[1.2s] ease-quiet group-hover:scale-[1.03]"
                  />
                )}
              </span>
              <span className="mt-3 flex gap-4 text-caption">
                <span className="text-ink-soft tabular-nums">Plate {plate(index + 1)}</span>
                <span>{item.caption}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-paper/97 p-0 text-ink backdrop:bg-transparent"
        aria-label="Gallery viewer"
      >
        {current && open !== null && (
          <div className="flex h-full flex-col px-5 py-5 md:px-10 md:py-8">
            <div className="flex items-center justify-between text-caption">
              <span className="tabular-nums text-ink-soft">
                Plate {plate(open + 1)} of {plate(count)}
              </span>
              <button type="button" onClick={() => dialog.current?.close()} className="link-quiet py-2">
                Close
              </button>
            </div>
            <div className="relative my-5 flex min-h-0 flex-1 items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-full w-full items-center justify-center"
                >
                  {current.kind === "video" ? (
                    <video src={current.src} poster={current.poster} controls autoPlay playsInline className="max-h-full max-w-full bg-ink" aria-label={current.alt} />
                  ) : (
                    // Small source photos are capped at twice their size so they don't turn to mush.
                    <div
                      className="relative max-h-full w-full"
                      style={{ aspectRatio: `${current.photo.width} / ${current.photo.height}`, maxWidth: current.photo.width < 1200 ? current.photo.width * 2 : undefined }}
                    >
                      <Image src={current.photo.src} alt={current.photo.alt} fill sizes="100vw" quality={80} className="object-contain" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between gap-6">
              <p className="font-display text-[1.375rem]">{current.caption}</p>
              <div className={cn("flex shrink-0 gap-6", count < 2 && "hidden")}>
                <button type="button" onClick={() => step(-1)} className="link-quiet py-2">
                  Previous
                </button>
                <button type="button" onClick={() => step(1)} className="link-quiet py-2">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

// Big photos get a wide tile, the portrait video a tall one spanning two
// rows, and small photos (under 1200px) stay modest so they aren't stretched.
function tileSpan(item: GalleryItem) {
  if (item.kind === "video") return "col-span-2 max-w-[360px] md:col-span-4 md:row-span-2 md:max-w-none";
  if (item.photo.width >= 1200) return "col-span-2 md:col-span-8";
  return "col-span-1 md:col-span-4";
}

function tileAspect(item: GalleryItem) {
  if (item.kind === "video") return "aspect-[9/16]";
  if (item.photo.width >= 1200) return "aspect-[4/3]";
  return item.photo.height > item.photo.width ? "aspect-[3/4]" : "aspect-[4/3]";
}
