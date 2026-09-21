import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/shell";
import { Eyebrow, PrimaryLink, Rule } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "About | CaseBind",
  description:
    "CaseBind Systems builds case management software for Canadian immigration firms, from inside a regulated practice in Toronto.",
};

// One page, three sections, each an anchor the Company menu can point at.
const SECTIONS: { id: string; eyebrow: string; title: string; body: string[] }[] = [
  {
    id: "who",
    eyebrow: "Who we are",
    title: "Software people working inside an immigration practice.",
    body: [
      "CaseBind Systems is a small Toronto team. The platform grew out of a CICC-regulated consultancy that needed one place for its cases, forms, retainers and payments, and could not find it off the shelf.",
      "We build it next to the consultants who use it every day, so the product is shaped by real files, real deadlines and real practice reviews — not by what a demo looks like.",
    ],
  },
  {
    id: "building",
    eyebrow: "What we're building",
    title: "One system for the whole file, from first call to decision.",
    body: [
      "Case pipeline, client records, versioned checklists, IRCC form autofill, submission packages assembled in the browser, e-signed agreements, a client portal, booking, payments and an audit log — one login, one record of truth.",
      "Documents stay in the firm's own OneDrive or SharePoint. Data stays in Canada. Every view, edit and export is recorded, because a practice has to be able to show its work.",
    ],
  },
  {
    id: "vision",
    eyebrow: "Goals & vision",
    title: "The platform every Canadian immigration firm runs on — without owning their data.",
    body: [
      "The goal is simple: a consultant should spend their time on the file, not on re-keying it. Every hour we give back to a practice is the measure of the product.",
      "What it will never do: read a firm's cases for our own purposes, sell access to their clients, or lock a practice in. A firm's documents live in its own storage, its data exports at any time, and the operator of the platform cannot see inside a firm's records by construction.",
    ],
  },
];

export default function AboutPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "About" }]}
      title="About CaseBind"
      subtitle="Case management for Canadian immigration firms, built inside one."
    >
      <div className="flex flex-col gap-16 pb-24">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="grid scroll-mt-28 gap-6 lg:grid-cols-[260px_1fr]">
            <div>
              <Eyebrow>{s.eyebrow}</Eyebrow>
            </div>
            <div className="max-w-[640px]">
              <h2 className="font-[family-name:var(--font-display)] text-[30px] leading-tight tracking-[-0.01em] text-[var(--ink)]">
                {s.title}
              </h2>
              {s.body.map((para) => (
                <p key={para} className="mt-4 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}

        <Rule />

        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-md text-[15px] leading-relaxed text-[var(--ink-muted)]">
            We onboard a small number of firms at a time, free through alpha
            and beta, with a week of hands-on training.
          </p>
          <PrimaryLink href="/#request">Request alpha access</PrimaryLink>
        </div>
      </div>
    </MarketingShell>
  );
}
