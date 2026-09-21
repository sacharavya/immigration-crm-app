import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { GradientBlock, WhiteLink } from "@/components/marketing/ui";
import { MarketingShell } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: "About Us — genzdatalabs Immigration Consulting Inc",
  description:
    "A licensed Canadian immigration firm (RCIC# R7111111) founded in 2021, serving clients from Toronto and Kathmandu with efficient, transparent and accountable representation.",
};

const STAT_TILES = [
  { big: "Toronto", small: "Head office · 211-2390 Eglinton Ave E", bg: "linear-gradient(180deg,#F1F5FD,#fff)" },
  { big: "Kathmandu", small: "Branch office · Nepal", bg: "linear-gradient(180deg,#F6F1FC,#fff)" },
  { big: "RCIC", small: "Partnered with licensed RCIC · R7111111", bg: "linear-gradient(180deg,#E4F7EF,#fff)" },
  { big: "Since 2021", small: "Affordable, effective and expeditious solutions", bg: "linear-gradient(180deg,#EEF6FB,#fff)" },
];

const VALUES = [
  "Integrity",
  "Transparency",
  "Accountability",
  "Fairness",
  "Diversity",
];

const COMMITMENTS = [
  "A licensed RCIC reviews and signs off on every application we file.",
  "Honest assessments: if a pathway is weak, we say so before you spend money on it.",
  "Clear fees in a written retainer tied to the CICC Code, before any work begins.",
  "Your documents and data stay in Canada, with access limited to the people on your file.",
  "One point of contact who actually knows your case, from first question to settlement.",
];

export default function AboutUsPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "About us" }]}
      title="Licensed, local, and with you for the long run."
      subtitle="genzdatalabs Immigration Consulting Inc is a regulated Canadian immigration firm guiding individuals and families through study, work and permanent residence."
    >
      {/* Who we are */}
      <section className="grid items-start gap-10 pt-10 lg:grid-cols-2">
        <div className="space-y-4 text-[15.5px] leading-relaxed text-[#0F5132]/90">
          <div className="flex items-center self-start rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5">
            <Image
              src="/RCIC.png"
              alt="RCIC - Regulated Canadian Immigration Consultant"
              width={280}
              height={100}
              unoptimized
              className="h-12 w-auto"
            />
          </div>
          <p>
            We are a Toronto-based immigration consultancy founded in 2021,
            partnered with licensed RCICs regulated by the College of
            Immigration and Citizenship Consultants (CICC), with a branch office in Kathmandu serving clients across
            South Asia and around the world.
          </p>
          <p>
            Study permits, work permits, Express Entry, provincial nomination,
            family sponsorship, citizenship: whatever the pathway, the promise
            is the same, efficient, transparent and accountable representation
            from the first question to settlement and beyond.
          </p>
          <p>
            We built our own practice-management platform to run this firm,
            which means less time on paperwork and more time on your case, and
            every deadline, document and dollar tracked in one place.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              href="/book-an-appointment"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#0F5132] px-4.5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#146540]"
            >
              Book a consultation <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://www.youtube-nocookie.com/embed/iDo3mRevQLU"
              className="rounded-[10px] border border-[#D9E2EC] px-4.5 py-2.5 text-[13.5px] font-semibold text-[#0F5132] hover:border-[#0F5132]"
            >
              Watch our story
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STAT_TILES.map((t) => (
            <div
              key={t.big}
              className="rounded-2xl border border-[#D9E2EC] p-5.5"
              style={{ background: t.bg }}
            >
              <div className="text-[28px] font-extrabold tracking-[-.02em]">
                {t.big}
              </div>
              <div className="mt-1 text-[12.5px] text-[#4B5563]">{t.small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="grid gap-4 pt-20 md:grid-cols-3">
        <div
          className="flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] p-7"
          style={{ background: "linear-gradient(180deg,#F1F5FD,#fff)" }}
        >
          <div className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#0F5132]">
            OUR MISSION
          </div>
          <div className="text-lg font-bold leading-snug">
            Efficient, transparent, accountable.
          </div>
          <p className="text-[13.5px] leading-relaxed text-[#4B5563]">
            With you from the first question to settlement and beyond.
          </p>
        </div>
        <div
          className="flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] p-7"
          style={{ background: "linear-gradient(180deg,#F6F1FC,#fff)" }}
        >
          <div className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#0F5132]">
            OUR VISION
          </div>
          <div className="text-lg font-bold leading-snug">
            Canada&apos;s most trusted immigration firm.
          </div>
          <p className="text-[13.5px] leading-relaxed text-[#4B5563]">
            Client satisfaction first, every time.
          </p>
        </div>
        <div
          className="flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] p-7"
          style={{ background: "linear-gradient(180deg,#E4F7EF,#fff)" }}
        >
          <div className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#0F5132]">
            OUR VALUES
          </div>
          <div className="text-lg font-bold leading-snug">
            What we bring to every client.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VALUES.map((v) => (
              <span
                key={v}
                className="rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-semibold"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="pt-20">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:p-10">
          <div className="font-[family-name:var(--font-dm-mono)] text-[10.5px] tracking-[.16em] text-[#0F5132]">
            OUR COMMITMENTS
          </div>
          <h2 className="mt-3 text-balance text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.1] tracking-[-.03em]">
            What working with us looks like.
          </h2>
          <ul className="mt-6 grid gap-3.5 sm:grid-cols-2">
            {COMMITMENTS.map((c) => (
              <li
                key={c}
                className="flex gap-2.5 text-[14.5px] leading-relaxed text-[#0F5132]/90"
              >
                <Check
                  className="mt-1 h-4 w-4 shrink-0 text-[#D4AF7C]"
                  strokeWidth={2.5}
                />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 pt-20">
        <GradientBlock className="flex flex-col items-start gap-4 p-8 sm:p-12">
          <h2 className="relative text-balance text-[clamp(26px,3.2vw,38px)] font-extrabold leading-[1.1] tracking-[-.03em]">
            Ready to start your pathway?
          </h2>
          <p className="relative max-w-[520px] text-[15px] leading-relaxed text-white/90">
            Book a consultation and get an honest read on your options from a
            licensed consultant.
          </p>
          <div className="relative flex flex-wrap gap-2.5">
            <WhiteLink href="/book-an-appointment">
              Book a consultation <ArrowRight className="h-4 w-4" />
            </WhiteLink>
            <Link
              href="/immigration-consulting#services"
              className="inline-flex items-center rounded-[10px] border border-white/60 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Explore services
            </Link>
          </div>
        </GradientBlock>
      </section>
    </MarketingShell>
  );
}
