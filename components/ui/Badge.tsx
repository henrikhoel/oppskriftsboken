import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeTone = "clay" | "olive" | "mustard" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  clay: "bg-clay-light text-clay-dark",
  olive: "bg-olive-light text-olive-dark",
  mustard: "bg-mustard-light text-clay-dark",
  neutral: "bg-cream-dark text-ink-soft",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
