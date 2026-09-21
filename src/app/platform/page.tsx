import type { Metadata } from "next";
import Link from "next/link";

import { FEATURE_GROUPS } from "@/components/marketing/features";
import { MarketingShell } from "@/components/marketing/shell";
import { Eyebrow, PrimaryLink, Rule } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Platform | CaseBind",
  description:
    "Every feature of CaseBind, grouped the way an immigration firm works: case management, documents and forms, practice operations.",
};

export default function PlatformPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Platform" }]}
      title="Everything on the platform"
      subtitle="Grouped the way a firm works. Anything not yet shipped says so."
    >
      <div className="flex flex-col gap-16 pb-24">
        {FEATURE_GROUPS.map((group) => (
          <section key={group.heading} className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <div>
              <Eyebrow>{group.heading}</Eyebrow>
            </div>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {group.features.map((f) => (
                <li key={f.slug} id={f.slug} className="scroll-mt-28">
                  <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-[var(--ink)]">
                    {f.label}
                    {f.tag && (
                      <span className="rounded-full border border-[var(--rule)] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[.08em] text-[var(--ink-faint)]">
                        {f.tag}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                    {f.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Rule />

        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Free through alpha and beta, with a week of hands-on training. We
            onboard a small number of firms at a time.
          </p>
          <div className="flex items-center gap-4">
            <PrimaryLink href="/#request">Request alpha access</PrimaryLink>
            <Link
              href="/#faq"
              className="text-[13.5px] font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
