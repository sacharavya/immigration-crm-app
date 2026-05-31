import { ArrowRight } from "lucide-react";

import type { PublicBookingType } from "./types";

function formatFee(fee: number | null): string {
  if (fee === null) return "Free";
  if (fee === 0) return "Free";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(fee);
}

export function StepPickType({
  types,
  onSelect,
}: {
  types: PublicBookingType[];
  onSelect: (t: PublicBookingType) => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">
          Book an appointment
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Pick the kind of meeting you&apos;d like.
        </p>
      </header>

      <ul className="space-y-3">
        {types.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t)}
              className="group flex w-full items-start gap-4 rounded-md border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--navy)]/40 hover:shadow-md"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-stone-900">
                    {t.name}
                  </h2>
                  <span className="text-xs text-stone-500">
                    · {t.duration_minutes} minutes
                  </span>
                </div>
                {t.description && (
                  <p className="mt-1 text-sm text-stone-600">
                    {t.description}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                  {formatFee(t.fee_cad)}
                </div>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--navy)]" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
