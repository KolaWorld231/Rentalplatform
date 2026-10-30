import { PropertyForm } from "@/components/forms/PropertyForm";
import { createPropertyAction } from "../actions";

export const metadata = { title: "List a Property" };

export default function NewPropertyPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">List a property</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        Listing is free, always. You can save as a draft and add photos after creating it.
      </p>
      <div className="mt-6 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-raised)]">
        <PropertyForm action={createPropertyAction} submitLabel="Create listing" />
      </div>
    </div>
  );
}
