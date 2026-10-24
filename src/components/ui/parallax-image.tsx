"use client";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { Photo } from "@/content/images";
import { cn } from "@/lib/cn";

// A photo that drifts slowly inside its frame as the page scrolls.
// Give the frame its size with className (e.g. aspect-[4/5]).
export function ParallaxImage({
  photo,
  sizes,
  className,
  arch = false,
  drift = 8,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
  arch?: boolean;
  drift?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${drift}%`, `${drift}%`]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-sand", arch && "arch", className)}>
      <motion.div className="absolute inset-x-0 -top-[10%] -bottom-[10%]" style={{ y: reduce ? 0 : y }}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} quality={80} className="object-cover" />
      </motion.div>
    </div>
  );
}
