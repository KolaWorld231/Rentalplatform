"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/utils/format";

const AGENT_FEE_PER_VIEWING_USD = 35;

export function SavingsCalculator({
  passPriceUsd,
}: {
  passPriceUsd: number;
}) {
  const [propertyCount, setPropertyCount] = useState(3);
  const agentCost = propertyCount * AGENT_FEE_PER_VIEWING_USD;
  const savings = Math.max(0, agentCost - passPriceUsd);

  return (
    <div className="rounded-[var(--radius-lg)] bg-ivory-100 p-6 shadow-[var(--shadow-clay-inset)]">
      <label htmlFor="property-count" className="flex items-center justify-between text-sm font-medium text-charcoal-700">
        <span>Properties you&apos;d want to contact</span>
        <span className="font-display text-lg font-semibold text-brand-800">{propertyCount}</span>
      </label>
      <input
        id="property-count"
        type="range"
        min={1}
        max={10}
        value={propertyCount}
        onChange={(e) => setPropertyCount(Number(e.target.value))}
        className="focus-ring mt-3 w-full accent-clay-500"
        aria-describedby="savings-result"
      />

      <div id="savings-result" className="mt-5 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-charcoal-400">Paying agents per viewing</p>
          <p className="mt-1 font-display text-xl font-semibold text-charcoal-500 line-through">
            {formatUsd(agentCost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-charcoal-400">With the Direct Access Pass</p>
          <p className="mt-1 font-display text-xl font-semibold text-brand-800">{formatUsd(passPriceUsd)}</p>
        </div>
      </div>

      {savings > 0 && (
        <p className="mt-4 text-center text-sm font-medium text-success-500">
          You&apos;d save {formatUsd(savings)} by contacting those {propertyCount} owners directly.
        </p>
      )}
    </div>
  );
}
