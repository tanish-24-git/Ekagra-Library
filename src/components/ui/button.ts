import { cn } from "@/lib/cn";

export const buttonClass = (variant: "primary" | "light" = "primary", className?: string) =>
  cn(
    "btn-gloss inline-flex items-center justify-center rounded-full px-6 py-3 text-body font-medium leading-none",
    variant === "primary" && "bg-ink text-paper hover:bg-bronze",
    variant === "light" && "btn-gloss-light bg-paper text-ink hover:bg-linen",
    className,
  );
