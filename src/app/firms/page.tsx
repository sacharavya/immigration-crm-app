import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LIVE_FIRMS, SHOW_MARQUEE } from "@/components/marketing/firms";
import { PublicChrome } from "@/components/marketing/shell";
import { DarkSection, Display, Eyebrow, PrimaryLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Firms on CaseBind",
  description: "The immigration practices running their casework on CaseBind.",
};

// Fill the strip regardless of how many firms there are; the animation
// moves exactly one set, so the loop is seamless at any count.
const SETS = Math.max(2, Math.ceil(10 / Math.max(1, LIVE_FIRMS.length)));

function LogoRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <ul aria-hidden={ariaHidden} className="flex shrink-0 items-center gap-16 pr-16">
      {Array.from({ length: SETS }, () => LIVE_FIRMS).flat().map((f, i) => (
        <li key={`${f.name}-${i}`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- firm-uploaded asset, sized by height */}
          <img src={f.logo} alt={ariaHidden ? "" : f.name} className="max-h-9 w-auto max-w-[180px] object-contain opacity-60 grayscale" />
        </li>
      ))}
    </ul>
  );
}

export default function FirmsPage() {
  return (
    <PublicChrome>
      <main className="relative z-10 flex-1">
        {/* Hero */}
        <header className="mx-auto w-full max-w-[1180px] px-6 pb-16 pt-24 sm:pt-32">
          <Eyebrow>Firms on CaseBind</Eyebrow>
          <Display as="h1" className="mt-6 max-w-[12ch] text-balance text-[clamp(44px,7vw,92px)] leading-[0.98]">
            Built for regulated work.
          </Display>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-[var(--ink-muted)]">
              Canadian immigration practices run their cases, forms, retainers
              and payments on CaseBind.
            </p>
            <div className="flex flex-wrap gap-3">
              <PrimaryLink href="/#request">
                Request alpha access <ArrowRight className="h-4 w-4" />
              </PrimaryLink>
              <Link
                href="/platform"
                className="inline-flex items-center rounded-[var(--radius)] border border-[var(--ink)]/20 px-4 py-2.5 text-[13.5px] font-semibold text-[var(--ink)] hover:border-[var(--ink)]/40"
              >
                See the platform
              </Link>
            </div>
          </div>
        </header>

        {/* Marquee, edge to edge, faded at both ends. */}
        {SHOW_MARQUEE && (
          <div
            className="marquee relative overflow-hidden py-8"
            style={{ maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}
          >
            <div className="marquee-track flex w-max">
              <LogoRow />
              <LogoRow ariaHidden />
            </div>
          </div>
        )}

        {/* Logo collection: dark tiles, every mark in the same grey and the
            same box. grayscale+invert turns each logo light and any opaque
            white background black; screen blending then drops that black
            into the tile, so a logo shipped on white reads like a cut-out. */}
        <DarkSection className="py-24">
          <h2 className="max-w-[24ch] text-balance font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,44px)] leading-[1.05] tracking-[-0.02em]">
            Trusted by Canadian immigration practices.
          </h2>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {LIVE_FIRMS.map((f) => (
              <li
                key={f.name}
                className="flex aspect-[5/3] items-center justify-center rounded-[calc(var(--radius)*1.5)] bg-white/[0.06] p-8 transition-colors hover:bg-white/[0.09]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- firm-uploaded asset, sized by its box */}
                <img
                  src={f.logo}
                  alt={f.name}
                  className="max-h-12 w-auto max-w-[190px] object-contain opacity-75 grayscale invert mix-blend-screen"
                />
              </li>
            ))}
          </ul>
        </DarkSection>
      </main>
    </PublicChrome>
  );
}
