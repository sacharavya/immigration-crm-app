"use client";

import {
  ArrowRight,
  Clock,
  FolderOpen,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";

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

function cardMeta(code: string): {
  icon: React.ReactNode;
  badge: string | null;
  badgeColor: string;
} {
  const iconClass = "h-5 w-5 text-[var(--gold)]";
  switch (code) {
    case "initial_consultation":
      return {
        icon: <MessageSquare className={iconClass} />,
        badge: "New clients",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "case_review":
      return {
        icon: <FolderOpen className={iconClass} />,
        badge: "Existing clients",
        badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      };
    default:
      return {
        icon: <Clock className={iconClass} />,
        badge: null,
        badgeColor: "",
      };
  }
}

export function StepPickType({
  types,
  onSelect,
}: {
  types: PublicBookingType[];
  onSelect: (t: PublicBookingType) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Licence strip: the shell's band carries the page title, so this
          stays compact next to the type cards. */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#D9E2EC] bg-white px-5 py-4">
        <Image
          src="/RCIC.png"
          alt="RCIC — Regulated Canadian Immigration Consultant"
          width={579}
          height={189}
          unoptimized
          className="h-12 w-auto object-contain"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1B365D]">
            Big Bang Immigration Consulting
          </p>
          <p className="text-xs text-[#5A6A85]">
            Regulated Canadian Immigration Consultant · RCIC# R711181 ·
            Licensed by the CICC
          </p>
        </div>
      </div>

      {/* ── Meeting type cards ─────────────────────────────────── */}
      <ul className="space-y-3">
        {types.map((t) => (
          <li key={t.id}>
            <TypeCard type={t} onSelect={() => onSelect(t)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypeCard({
  type,
  onSelect,
}: {
  type: PublicBookingType;
  onSelect: () => void;
}) {
  const isPaid = type.fee_cad !== null && type.fee_cad > 0;
  const meta = cardMeta(type.code);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-start gap-4 border border-[#D9E2EC] bg-white p-5 text-left"
      style={{ borderLeftWidth: 4, borderLeftColor: "var(--navy)" }}
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3D6FD8]/[0.06]">
        {meta.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-stone-900">
            {type.name}
          </h2>
          {meta.badge && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badgeColor}`}
            >
              {meta.badge}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-stone-500">
          {type.duration_minutes} minutes
        </p>

        {type.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {type.description}
          </p>
        )}

        {isPaid && (
          <p className="mt-2 text-xs font-medium text-amber-800">
            Payment via Interac e-Transfer required to confirm booking.
          </p>
        )}
      </div>

      {/* Price + arrow */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div
          className={`text-lg font-semibold tabular-nums ${isPaid ? "text-[#3D6FD8]" : "text-emerald-600"}`}
        >
          {formatFee(type.fee_cad)}
        </div>
        <ArrowRight className="h-5 w-5 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#3D6FD8]" />
      </div>
    </button>
  );
}
