"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  labelId: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  placeholder: string;
};

// A themed multi-select: a button that opens a panel of checkboxes. The
// browser's own dropdowns can't be styled, so this replaces them.
export function ExamSelect({ id, labelId, options, selected, onToggle, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Close when a click, tap or focus lands anywhere outside.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
    };
  }, [open]);

  const boxes = () => [...(root.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]") ?? [])];

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    } else if (e.key === "Enter" && (e.target as HTMLElement).matches("input[type=checkbox]")) {
      e.preventDefault();
      (e.target as HTMLInputElement).click();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        requestAnimationFrame(() => boxes()[0]?.focus());
        return;
      }
      const list = boxes();
      const at = list.indexOf(document.activeElement as HTMLInputElement);
      list[e.key === "ArrowDown" ? Math.min(at + 1, list.length - 1) : Math.max(at - 1, 0)]?.focus();
    }
  };

  return (
    <div ref={root} onKeyDown={onKeyDown} className="relative">
      <button
        ref={trigger}
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${labelId} ${id}-value`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "mt-2 flex w-full cursor-pointer items-center justify-between gap-4 border-b py-2.5 text-left text-body transition-colors duration-300 ease-quiet focus:border-ink focus:shadow-[0_1px_0_0_var(--color-ink)] focus:outline-none",
          open ? "border-ink" : "border-rule hover:border-ink",
        )}
      >
        <span id={`${id}-value`} className={cn("truncate", selected.length ? "text-ink" : "text-ink-soft/70")}>
          {selected.length ? selected.join(", ") : placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={cn("size-4 shrink-0 text-ink-soft transition-transform duration-300 ease-quiet", open && "rotate-180")}
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            // On a phone the panel can open below the fold; bring all of it into view.
            ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })}
            id={`${id}-panel`}
            role="group"
            aria-labelledby={labelId}
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border border-rule bg-paper p-2 shadow-[0_28px_56px_-28px_rgba(59,49,43,0.4)]"
          >
            <div className="grid sm:grid-cols-2">
              {options.map((option) => {
                const on = selected.includes(option);
                return (
                  <label
                    key={option}
                    className="flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-linen has-[:focus-visible]:bg-linen"
                  >
                    <input type="checkbox" checked={on} onChange={() => onToggle(option)} className="peer sr-only" />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors duration-200",
                        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze",
                        on ? "border-ink bg-ink text-paper" : "border-taupe/50 bg-paper text-transparent",
                      )}
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5">
                        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-body leading-snug text-ink">{option}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-rule px-3 pt-3 pb-1.5">
              <span className="text-caption text-ink-soft">{selected.length ? `${selected.length} chosen` : "Choose any"}</span>
              <button type="button" onClick={close} className="link-quiet cursor-pointer text-caption text-ink">
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
