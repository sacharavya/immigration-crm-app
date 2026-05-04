import { Lock } from "lucide-react";
import Link from "next/link";

const TABS = [
  { key: "retainer", label: "Retainer" },
  { key: "documents", label: "Documents" },
  { key: "intake", label: "Intake form" },
  { key: "activity", label: "Activity" },
  { key: "tasks", label: "Tasks" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
] as const;

export type Tab = (typeof TABS)[number]["key"];

export const VALID_TABS = TABS.map((t) => t.key) as readonly Tab[];

// Tabs that stay accessible even when the retainer isn't signed yet.
// Retainer is the gating tab; Payments stays unlocked because the firm
// needs to record the retainer payment to clear the phase gate.
const NEVER_LOCKED: ReadonlySet<Tab> = new Set<Tab>(["retainer", "payments"]);

export function CaseTabs({
  caseId,
  activeTab,
  retainerReady,
}: {
  caseId: string;
  activeTab: Tab;
  retainerReady: boolean;
}) {
  return (
    <nav className="flex gap-6 border-b border-stone-200">
      {TABS.map((t) => {
        const active = t.key === activeTab;
        const locked = !retainerReady && !NEVER_LOCKED.has(t.key);
        const href = `/dashboard/cases/${caseId}?tab=${t.key}`;

        const baseCls = "-mb-px border-b-2 px-1 pb-2 text-sm transition-colors";
        const activeCls =
          "border-[var(--navy)] font-medium text-[var(--navy)]";
        const idleCls = "border-transparent text-stone-500 hover:text-stone-800";
        const lockedCls =
          "border-transparent cursor-not-allowed opacity-40 text-stone-500";

        // Retainer tab gets a subtle emphasis when it's the only fully
        // actionable tab (i.e. retainer not ready). Soft amber underline.
        const retainerEmphasis =
          t.key === "retainer" && !retainerReady && !active
            ? "border-amber-300 text-amber-800 hover:text-amber-900"
            : "";

        if (locked) {
          return (
            <span
              key={t.key}
              title="Sign the retainer first"
              aria-disabled="true"
              className={`${baseCls} ${lockedCls} inline-flex items-center gap-1`}
            >
              <Lock className="h-3 w-3" aria-hidden />
              {t.label}
            </span>
          );
        }

        return (
          <Link
            key={t.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${baseCls} ${
              active ? activeCls : idleCls
            } ${retainerEmphasis}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
