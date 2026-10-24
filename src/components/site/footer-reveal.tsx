"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

// The page lifts away like a card to uncover the footer, which sits fixed
// underneath. Only on screens tall enough to show the whole footer; on phones
// it's an ordinary footer.
export function FooterReveal({ children }: { children: React.ReactNode }) {
  const roomy = useMediaQuery("(min-width: 768px) and (min-height: 700px)");
  const reduce = useReducedMotion();
  const spacer = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = panel.current;
    if (!el || !roomy) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [roomy]);

  // 0 when the footer starts to show, 1 when it's fully uncovered.
  const { scrollYProgress } = useScroll({ target: spacer, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-22%", "0%"]);

  return (
    <>
      {/* Always rendered, because useScroll needs its target on the page. */}
      <div ref={spacer} aria-hidden style={{ height: roomy ? height : 0 }} />
      {roomy ? (
        <div ref={panel} className="fixed inset-x-0 bottom-0 z-0 bg-sand">
          <motion.div style={{ y: reduce ? 0 : y }}>{children}</motion.div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
