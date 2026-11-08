/**
 * The 231Rentals mark: a roof over "231" on a rounded-square tile, per
 * the brand kit. Colors come from currentColor/fill props so it adapts
 * to light/dark and the "on red" tile variant without separate SVGs.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <rect width="56" height="56" rx="16" fill="currentColor" className="text-brand-600" />
      <path
        d="M12 25 28 11l16 14"
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="28"
        y="45"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontSize="19"
        fill="var(--color-surface)"
      >
        231
      </text>
    </svg>
  );
}
