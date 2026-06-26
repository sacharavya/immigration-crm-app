// Single source for the KPI config and the favorability rule, so the badge
// color, its accessible label, and the caption never drift apart.

import type { KpiKey, KpiView } from "./types";

export type KpiConfig = {
  key: KpiKey;
  label: string;
  unit: string | null;
  higherIsBetter: boolean;
  format: "count" | "currency";
  hint: string;
};

export const KPI_METRICS: readonly KpiConfig[] = [
  {
    key: "active_cases",
    label: "Active cases",
    unit: "open",
    higherIsBetter: true,
    format: "count",
    hint: "Cases that are not closed.",
  },
  {
    key: "clients",
    label: "Clients",
    unit: null,
    higherIsBetter: true,
    format: "count",
    hint: "All clients on file.",
  },
  {
    key: "retained_mtd",
    label: "Retained this month",
    unit: "cases",
    higherIsBetter: true,
    format: "count",
    hint: "Cases retained this calendar month.",
  },
  {
    key: "outstanding_fees",
    label: "Outstanding fees",
    unit: null,
    higherIsBetter: false,
    format: "currency",
    hint: "Service fee plus government fee plus HST, minus collected, across active cases.",
  },
] as const;

export type Direction = "up" | "down" | "flat";
export type Favorable = "good" | "bad" | "neutral";

export type ChangeBadge = {
  direction: Direction;
  favorable: Favorable;
  // "21%", "new", or "" when flat / no prior data.
  display: string;
  ariaLabel: string;
};

// The arrow shows the direction of change. The color shows whether that change
// is good for this metric, decided by higherIsBetter, not by the arrow. So a
// decrease in outstanding fees (higherIsBetter false) is favorable and green
// even though the arrow points down.
export function changeBadge(args: {
  current: number;
  previous: number | null;
  higherIsBetter: boolean;
}): ChangeBadge {
  const { current, previous, higherIsBetter } = args;

  if (previous === null) {
    return {
      direction: "flat",
      favorable: "neutral",
      display: "",
      ariaLabel: "no prior period to compare",
    };
  }

  // New: previously zero, now positive. Treat as an up move.
  if (previous === 0 && current > 0) {
    const favorable: Favorable = higherIsBetter ? "good" : "bad";
    return {
      direction: "up",
      favorable,
      display: "new",
      ariaLabel: `new this period, ${favorable === "good" ? "favorable" : "unfavorable"}`,
    };
  }

  const direction: Direction =
    current > previous ? "up" : current < previous ? "down" : "flat";

  if (direction === "flat") {
    return {
      direction,
      favorable: "neutral",
      display: "",
      ariaLabel: "no change from last month",
    };
  }

  const favorable: Favorable =
    (direction === "up") === higherIsBetter ? "good" : "bad";
  const percent =
    previous === 0 ? 0 : Math.round((Math.abs(current - previous) / Math.abs(previous)) * 100);

  return {
    direction,
    favorable,
    display: `${percent}%`,
    ariaLabel: `${direction} ${percent} percent, ${favorable === "good" ? "favorable" : "unfavorable"}`,
  };
}

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function formatKpiValue(view: KpiView): string {
  return view.format === "currency"
    ? cadFormatter.format(view.current)
    : view.current.toLocaleString("en-CA");
}

// The caption carries the change in words, so the meaning never rests on color
// alone: dollar metrics report the absolute dollar delta, count metrics report
// the absolute count delta.
export function kpiCaption(view: KpiView): string {
  const { previous, current } = view;
  if (previous === null) return "no prior month to compare yet";
  const delta = current - previous;
  if (delta === 0) return "no change from last month";

  if (view.format === "currency") {
    const amount = cadFormatter.format(Math.abs(delta));
    return delta < 0
      ? `${amount} less owed than last month`
      : `${amount} more owed than last month`;
  }

  const abs = Math.abs(delta).toLocaleString("en-CA");
  return delta > 0 ? `+${abs} from last month` : `-${abs} from last month`;
}
