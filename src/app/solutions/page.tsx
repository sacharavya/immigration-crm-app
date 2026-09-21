import type { Metadata } from "next";
import Link from "next/link";

import { FEATURE_GROUPS, SOLUTIONS } from "@/components/marketing/features";
import { MarketingShell } from "@/components/marketing/shell";
import { Eyebrow, PrimaryLink, Rule } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Solutions | CaseBind",
  description:
    "The problems an immigration practice walks in with, and which part of CaseBind answers each one.",
};

const FEATURES = new Map(
  FEATURE_GROUPS.flatMap((g) => g.features).map((f) => [f.slug, f]),
);

export default function SolutionsPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Solutions" }]}
      title="The problem, and where the platform answers it"
      subtitle="Read from the firm's side: what goes wrong in a practice, and the part of CaseBind built for it."
    >
      <div className="flex flex-col gap-16 pb-24">
        <ol className="grid gap-x-10 gap-y-12 lg:grid-cols-2">
          {SOLUTIONS.map((s) => {
            const feature = FEATURES.get(s.slug);
            return (
              <li key={s.slug} id={s.slug} className="grid scroll-mt-28 gap-3 border-t border-[var(--rule)] pt-6">
                <Eyebrow>The problem</Eyebrow>
                <h2 className="font-[family-name:var(--font-display)] text-[26px] leading-tight tracking-[-0.01em] text-[var(--ink)]">
                  {s.problem}
                </h2>
                <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">{s.solution}</p>
                {feature && (
                  <Link
                    href={`/platform#${feature.slug}`}
                    className="text-[13.5px] font-semibold text-[var(--slab)] underline-offset-4 hover:underline"
                  >
                    {feature.label} →
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <Rule />

        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Something else slowing your practice down? Tell us what it is; the
            alpha is shaped by the firms in it.
          </p>
          <PrimaryLink href="/#request">Request alpha access</PrimaryLink>
        </div>
      </div>
    </MarketingShell>
  );
}
