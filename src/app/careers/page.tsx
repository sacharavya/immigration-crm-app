import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/shell";
import { Eyebrow, PrimaryLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Careers | CaseBind",
  description: "Work on the case management platform Canadian immigration firms run on.",
};

// ponytail: no roles table until there is more than one role to list.
export default function CareersPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Careers" }]}
      title="Work on CaseBind"
      subtitle="A small team building software next to the consultants who use it."
    >
      <div className="grid gap-10 pb-24 lg:grid-cols-[260px_1fr]">
        <div>
          <Eyebrow>Open roles</Eyebrow>
        </div>
        <div className="max-w-[640px]">
          <h2 className="font-[family-name:var(--font-display)] text-[30px] leading-tight tracking-[-0.01em] text-[var(--ink)]">
            No open roles right now.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
            We hire slowly and in Toronto first. If you build web software
            carefully, or you have run immigration files and want to shape the
            tool you wished you had, write to us — say what you have built or
            handled, and what you would fix first.
          </p>
          <div className="mt-8">
            <PrimaryLink href="mailto:info@genzdatalabs.com?subject=Working%20on%20CaseBind">
              Write to us
            </PrimaryLink>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
