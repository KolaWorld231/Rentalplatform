import { ScoutApplyForm } from "@/components/scouts/ScoutApplyForm";
import { scoutProgram } from "@/lib/config/brand";
import { listOpenScoutAreas } from "@/lib/scouts/actions";

export const metadata = { title: `Apply — ${scoutProgram.name}` };

export default async function ScoutApplyPage() {
  const areas = await listOpenScoutAreas();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Scout Program</p>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Apply to become a scout</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Applications are reviewed in the order received. Seats are limited by area.
        </p>
      </div>

      {areas.length === 0 ? (
        <p className="text-sm text-charcoal-500">
          Applications aren&apos;t open for any area right now. Please check back soon.
        </p>
      ) : (
        <ScoutApplyForm areas={areas} />
      )}
    </div>
  );
}
