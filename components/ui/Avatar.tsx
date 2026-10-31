import { cn } from "@/lib/utils/cn";

const PALETTE = [
  "bg-brand-600 text-ivory-50",
  "bg-clay-500 text-ivory-50",
  "bg-info-500 text-ivory-50",
  "bg-sage-300 text-charcoal-700",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  name,
  className,
  size = "md",
}: {
  name: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}) {
  const label = name?.trim() || "?";
  const initial = label[0]!.toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
        colorFor(label),
        className,
      )}
    >
      {initial}
    </span>
  );
}
