import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FIRMS, FIRM_FACTS } from "@/components/marketing/firms";
import { MEDIA } from "@/components/marketing/media";
import { PublicChrome } from "@/components/marketing/shell";
import { DarkSection, Display, Eyebrow, GradientBlock, PrimaryLink, WhiteLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Firms on CaseBind",
  description: "The immigration practices running their casework on CaseBind.",
};

export default function FirmsPage() {
  const [featured, ...rest] = FIRMS;
  return (
    <PublicChrome>
      <main className="relative z-10 flex-1">
        {/* Hero: one line, set large, with the program in a sentence. */}
        <header className="mx-auto w-full max-w-[1180px] px-6 pb-20 pt-24 sm:pt-32">
          <Eyebrow>Firms on CaseBind</Eyebrow>
          <Display as="h1" className="mt-6 max-w-[12ch] text-balance text-[clamp(44px,7vw,92px)] leading-[0.98]">
            Built for regulated work.
          </Display>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-[var(--ink-muted)]">
              Canadian immigration practices run their cases, forms, retainers
              and payments on CaseBind — built inside one of them, used daily by
              its consultants.
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

        {/* Facts: big numerals on the slab, the way a customers page leads. */}
        <DarkSection className="py-20" image={MEDIA.securityBackdrop}>
          <ul className="grid divide-y divide-white/12 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {FIRM_FACTS.map((f) => (
              <li key={f.big} className="flex flex-col gap-3 py-8 sm:px-10 sm:py-2 sm:first:pl-0 sm:last:pr-0">
                <div className="font-[family-name:var(--font-display)] text-[clamp(44px,5vw,68px)] leading-none tracking-[-0.03em]">
                  {f.big}
                </div>
                <p className="max-w-[28ch] text-[13.5px] leading-relaxed text-white/60">{f.small}</p>
              </li>
            ))}
          </ul>
        </DarkSection>

        {/* Name wall */}
        <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule)] pb-5">
            <Eyebrow>Running on CaseBind</Eyebrow>
            <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-[var(--ink-faint)]">
              {FIRMS.length} {FIRMS.length === 1 ? "firm" : "firms"} · alpha
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-16 gap-y-6 pt-10">
            {FIRMS.map((f) => (
              <li key={f.name} className="flex flex-col gap-1">
                <span className="font-[family-name:var(--font-display)] text-[clamp(26px,3vw,40px)] leading-none tracking-[-0.02em] text-[var(--ink)]">
                  {f.name}
                </span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.16em] text-[var(--ink-faint)]">
                  {f.where} · {f.since}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Stories: the image is the card; the words sit on it. */}
        <section className="mx-auto w-full max-w-[1180px] px-6 pb-24">
          <div className="border-b border-[var(--rule)] pb-5">
            <Eyebrow>Firm stories</Eyebrow>
          </div>
          <div className="grid gap-6 pt-8">
            {[featured, ...rest].map((f, i) => (
              <Link
                key={f.name}
                href={f.href}
                className={
                  "on-dark group relative block overflow-hidden rounded-[calc(var(--radius)*2)] bg-[var(--slab)] text-white " +
                  (i === 0 ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/3]")
                }
              >
                <Image
                  src={f.image.src}
                  alt={f.image.alt}
                  fill
                  sizes="(min-width: 1180px) 1180px, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ objectPosition: f.image.position ?? "50% 50%" }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg,rgba(15,81,50,0) 30%,rgba(15,81,50,.55) 65%,rgba(15,81,50,.92) 100%)" }}
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-7 sm:p-10">
                  <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-white/70">
                    {f.name} · {f.where}
                  </span>
                  <h2 className="max-w-[26ch] text-balance font-[family-name:var(--font-display)] text-[clamp(24px,3.2vw,44px)] leading-[1.05] tracking-[-0.02em]">
                    {f.story}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white underline-offset-4 group-hover:underline">
                    Read the story <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="px-6 pb-28">
          <GradientBlock className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-8 p-10 sm:p-16">
            <Display className="relative max-w-[14ch] text-balance text-[clamp(30px,4vw,54px)]">
              Bring your firm onto CaseBind.
            </Display>
            <div className="relative">
              <WhiteLink href="/#request">
                Request alpha access <ArrowRight className="h-4 w-4" />
              </WhiteLink>
            </div>
          </GradientBlock>
        </section>
      </main>
    </PublicChrome>
  );
}
