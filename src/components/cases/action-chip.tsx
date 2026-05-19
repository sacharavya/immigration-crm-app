import type {
  ChipOutput,
  ChipResponsibility,
  ChipUrgency,
} from "@/lib/cases/action-chip";

type Props = {
  chip: ChipOutput;
  size?: "sm" | "md";
  className?: string;
};

/**
 * FLOW-3a: visual sibling of the static status pill. Renders the chip
 * computed by computeActionChip(). Informational only — not clickable,
 * no tooltips. If the text isn't clear enough, fix it in the
 * vocabulary table, not here.
 */
export function ActionChip({ chip, size = "md", className }: Props) {
  const { text, responsibility, urgency } = chip;
  const colorClass = colorFor(responsibility, urgency);
  const sizeClass =
    size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass} ${className ?? ""}`}
    >
      <span
        aria-hidden
        className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(responsibility, urgency)}`}
      />
      {text}
    </span>
  );
}

function colorFor(r: ChipResponsibility, u: ChipUrgency): string {
  // Overdue trumps everything.
  if (u === "overdue") {
    return "bg-red-50 text-red-900 ring-1 ring-red-200";
  }
  if (u === "sensitive") {
    if (r === "us") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
    if (r === "client")
      return "bg-purple-50 text-purple-900 ring-1 ring-purple-200";
    if (r === "ircc")
      return "bg-stone-100 text-stone-700 ring-1 ring-stone-300";
    return "bg-stone-50 text-stone-700";
  }
  // Normal.
  if (r === "us") return "bg-blue-50 text-blue-900";
  if (r === "client") return "bg-purple-50 text-purple-900";
  if (r === "ircc") return "bg-stone-100 text-stone-700";
  return "bg-stone-50 text-stone-600";
}

function dotColor(r: ChipResponsibility, u: ChipUrgency): string {
  if (u === "overdue") return "bg-red-500";
  if (u === "sensitive" && r === "us") return "bg-amber-500";
  if (r === "us") return "bg-blue-500";
  if (r === "client") return "bg-purple-500";
  if (r === "ircc") return "bg-stone-400";
  return "bg-stone-300";
}
