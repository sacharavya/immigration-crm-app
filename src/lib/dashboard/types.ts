// View models for the firm dashboard. The data layer (lib/dashboard/getX)
// composes finished view models so the components stay presentational.

export type KpiKey =
  | "active_cases"
  | "clients"
  | "retained_mtd"
  | "outstanding_fees";

export type KpiView = {
  key: KpiKey;
  label: string;
  unit: string | null;
  // Decides the favorable color independently of the arrow direction.
  higherIsBetter: boolean;
  format: "count" | "currency";
  current: number;
  // The value about 30 days ago. Null when no snapshot that old exists yet
  // (the badge then reads neutral with no percent).
  previous: number | null;
  // Oldest to newest, current value appended as the final point.
  series: number[];
  // Short hint shown next to the label's info icon.
  hint: string;
};

export type AttentionTier = "critical" | "high" | "action" | "aging";

export type NeedsAttentionRow = {
  caseId: string;
  clientName: string;
  tier: AttentionTier;
  reason: string;
  actionLabel: string;
  href: string;
};

export type PipelinePhase = {
  phase: number;
  label: string;
  count: number;
  // Cases in this phase whose ball is in the firm's court.
  onUs: number;
  href: string;
  // Submitted reads "with IRCC" instead of an on-us count.
  withIrcc: boolean;
};

export type RadarAxis = {
  key: string;
  label: string;
  decidedCount: number;
  approvedCount: number;
  // approvedCount / decidedCount, or null when below the sample floor.
  successRate: number | null;
};

export type RadarData = {
  service: RadarAxis[];
  category: RadarAxis[];
};

export type RecentRow = {
  caseId: string;
  caseNumber: string;
  clientName: string;
  // Service type display name; null when the case has no service set.
  serviceName: string | null;
  status: string;
  updatedAt: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  caseId: string | null;
  caseNumber: string | null;
  dueAt: string | null;
  dueDate: string | null;
  status: string;
  priority: string | null;
};
