import type { Metadata } from "next";

import { FIRMS } from "@/components/marketing/firms";
import { MarketingShell } from "@/components/marketing/shell";
import { PrimaryLink, Rule } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Firms on CaseBind",
  description: "The immigration practices running their casework on CaseBind.",
};

export default function FirmsPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Firms" }]}
      title="Firms on CaseBind"
      subtitle="Regulated Canadian immigration practices running their casework on the platform."
    >
      <div className="flex flex-col gap-16 pb-24">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FIRMS.map((f) => (
            <li
              key={f.name}
              className="flex flex-col gap-4 rounded-[calc(var(--radius)*1.5)] border border-[var(--rule)] bg-[var(--paper-raised)] p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold text-[var(--ink)]">{f.name}</h2>
                  <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.14em] text-[var(--ink-faint)]">
                    {f.where}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--slab)] px-2 py-0.5 text-[10.5px] font-medium text-white">
                  {f.since}
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-muted)]">{f.note}</p>
            </li>
          ))}
        </ul>

        <Rule />

        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-[15px] leading-relaxed text-[var(--ink-muted)]">
            We onboard a small number of firms at a time, free through alpha
            and beta, with a week of hands-on training.
          </p>
          <PrimaryLink href="/#request">Bring your firm onto CaseBind</PrimaryLink>
        </div>
      </div>
    </MarketingShell>
  );
}
