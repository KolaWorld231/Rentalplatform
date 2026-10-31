import { type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils/cn";

export interface ProcessStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * A connected numbered sequence instead of N equal cards in a row — the
 * "3 equal cards" layout is an AI-design tell (every step looks identical,
 * no visual hierarchy, no sense of progression). A spine with alternating
 * markers reads as a process, not a feature list.
 */
export function ProcessSteps({
  steps,
  accent = "brand",
  alternate = true,
}: {
  steps: ProcessStep[];
  accent?: "brand" | "clay";
  /** Zig-zag left/right on wide layouts; set false in a narrow column where it has no room to swing. */
  alternate?: boolean;
}) {
  const accentText = accent === "brand" ? "text-brand-600" : "text-clay-600";
  const accentBg = accent === "brand" ? "bg-brand-600" : "bg-clay-500";

  return (
    <div className="relative mt-6 flex flex-col gap-8 lg:gap-10">
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-[1.4rem] top-6 hidden w-px bg-border lg:block"
      />
      {steps.map((step, i) => (
        <Reveal key={step.title} delayMs={i * 100}>
          <div
            className={cn(
              "relative flex gap-5 lg:gap-6",
              alternate && i % 2 === 1 && "lg:flex-row-reverse lg:text-right",
            )}
          >
            <div className="relative z-10 flex shrink-0 flex-col items-center gap-2">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-semibold text-ivory-50",
                  accentBg,
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className={cn("flex-1 pb-2", alternate && i % 2 === 1 && "lg:flex lg:flex-col lg:items-end")}>
              <step.icon className={cn("h-6 w-6", accentText)} aria-hidden="true" />
              <h3 className="mt-2 font-semibold text-charcoal-700">{step.title}</h3>
              <p className="mt-1 max-w-md text-sm text-charcoal-500">{step.body}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
