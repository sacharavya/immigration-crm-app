import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FIRMS, FIRM_FACTS } from "@/components/marketing/firms";
import { MarketingShell } from "@/components/marketing/shell";
import { Eyebrow, Photo, PrimaryLink, Rule } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Firms on CaseBind",
  description: "The immigration practices running their casework on CaseBind.",
};

export default function FirmsPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Firms" }]}
      title="Built for regulated work"
      subtitle="Canadian immigration practices run their cases, forms, retainers and payments on CaseBind."
    >
      <div className="flex flex-col gap-16 pb-24">
        {/* Facts strip */}
        <ul className="grid gap-8 border-y border-[var(--rule)] py-8 sm:grid-cols-3">
          {FIRM_FACTS.map((f) => (
            <li key={f.big}>
              <div className="font-[family-name:var(--font-display)] text-[34px] leading-none tracking-[-0.02em] text-[var(--ink)]">
                {f.big}
              </div>
              <p className="mt-2 max-w-[260px] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                {f.small}
              </p>
            </li>
          ))}
        </ul>

        {/* Name wall — wordmarks, since firms bring no logo yet */}
        <div className="flex flex-col gap-5">
          <Eyebrow>Running on CaseBind</Eyebrow>
          <ul className="flex flex-wrap gap-x-12 gap-y-4">
            {FIRMS.map((f) => (
              <li
                key={f.name}
                className="font-[family-name:var(--font-display)] text-[22px] tracking-[-0.01em] text-[var(--ink)]/70"
              >
                {f.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Story cards */}
        <div className="flex flex-col gap-5">
          <Eyebrow>Firm stories</Eyebrow>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FIRMS.map((f) => (
              <li key={f.name} className="group flex flex-col gap-4">
                <Link href={f.href} className="block">
                  <Photo slot={f.image} className="aspect-[4/3]" />
                </Link>
                <div className="flex flex-col gap-2">
                  <p className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.14em] text-[var(--ink-faint)]">
                    {f.name} · {f.where}
                  </p>
                  <h2 className="text-[16px] font-bold leading-snug text-[var(--ink)]">
                    {f.story}
                  </h2>
                  <Link
                    href={f.href}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--slab)] underline-offset-4 group-hover:underline"
                  >
                    Read the story <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Rule />

        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 className="max-w-md font-[family-name:var(--font-display)] text-[28px] leading-tight tracking-[-0.01em] text-[var(--ink)]">
            Bring your firm onto CaseBind.
          </h2>
          <PrimaryLink href="/#request">Request alpha access</PrimaryLink>
        </div>
      </div>
    </MarketingShell>
  );
}
