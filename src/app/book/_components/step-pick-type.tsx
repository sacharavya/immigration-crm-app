"use client";

import { ArrowRight, ChevronUp } from "lucide-react";
import { useState } from "react";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function pick(t: PublicBookingType) {
    // Types without prep notes go straight through. Types with notes
    // expand the card so the prospect can see "what to expect" before
    // committing to picking a time.
    if (!t.preparation_notes?.trim()) {
      onSelect(t);
      return;
    }
    setExpandedId(t.id);
  }

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
        {types.map((t) => {
          const expanded = expandedId === t.id;
          return (
            <li key={t.id}>
              {expanded ? (
                <ExpandedCard
                  type={t}
                  onCollapse={() => setExpandedId(null)}
                  onContinue={() => onSelect(t)}
                />
              ) : (
                <CollapsedCard type={t} onPick={() => pick(t)} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CollapsedCard({
  type,
  onPick,
}: {
  type: PublicBookingType;
  onPick: () => void;
}) {
  const isPaid = type.fee_cad !== null && type.fee_cad > 0;
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-start gap-4 rounded-md border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--navy)]/40 hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-base font-semibold text-stone-900">
            {type.name}
          </h2>
          <span className="text-xs text-stone-500">
            · {type.duration_minutes} minutes
          </span>
        </div>
        {type.description && (
          <p className="mt-1 text-sm text-stone-600">{type.description}</p>
        )}
        {isPaid && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            Payment via Interac e-transfer required to confirm booking.
          </p>
        )}
        {!isPaid && (
          <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Free
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isPaid && (
          <div className="text-lg font-semibold tabular-nums text-[var(--navy)]">
            {formatFee(type.fee_cad)}
          </div>
        )}
        <ArrowRight className="h-5 w-5 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--navy)]" />
      </div>
    </button>
  );
}

function ExpandedCard({
  type,
  onCollapse,
  onContinue,
}: {
  type: PublicBookingType;
  onCollapse: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rounded-md border border-[var(--navy)]/40 bg-white p-5 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            {type.name}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {type.duration_minutes} minutes · {formatFee(type.fee_cad)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
        >
          <ChevronUp className="h-3.5 w-3.5" /> Collapse
        </button>
      </div>

      {type.description && (
        <p className="mt-3 text-sm text-stone-700">{type.description}</p>
      )}

      <div className="mt-4 border-t border-stone-100 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          What to expect
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {type.preparation_notes}
        </p>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--navy)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--navy)]/90"
        >
          Continue to time selection
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
