import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/index";

// Shared primitives for the marketing visual system (home + CRM landing).
// Tokens from the design handoff: navy #1E2136 text, primary #1E2136,
// border #D9E2EC, secondary text #5A6A85, hero gradient blues.

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F0F1F6] px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium uppercase tracking-[.16em] text-[#1E2136]">
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  subline,
}: {
  eyebrow: string;
  title: string;
  subline?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-3xl text-balance text-[clamp(28px,3.5vw,42px)] font-extrabold leading-[1.1] tracking-[-.03em]">
        {title}
      </h2>
      {subline && (
        <p className="max-w-xl text-base text-[#5A6A85]">{subline}</p>
      )}
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
  tone = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "red";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] px-5 py-3 text-sm font-semibold text-white transition-colors",
        tone === "primary"
          ? "bg-[#1E2136] shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] hover:bg-[#2E3252]"
          : "bg-[#62D4A6] text-[#1E2136] hover:bg-[#1E2136] hover:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function WhiteLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] border border-[#1E2136]/15 bg-white/95 px-5 py-3 text-sm font-semibold text-[#1E2136] transition-colors hover:bg-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

// Floating nav over the hero gradient.
export function MarketingNav({
  center,
  actions,
}: {
  center?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    // Sticky glass bar. The negative bottom margin lets the hero gradient
    // start underneath so the bar floats over it, exactly as when it lived
    // inside the band; page roots use overflow-x-clip (not hidden), which
    // is what keeps position:sticky working.
    <div className="sticky top-0 z-50 -mb-[72px] flex justify-center px-6 pt-4">
      <nav className="flex w-full max-w-[1100px] items-center justify-between gap-5 rounded-[14px] border border-white/60 bg-white/85 py-2.5 pl-4 pr-3 shadow-[0_8px_30px_-18px_rgba(27,54,93,.35)] backdrop-blur-xl">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/genzdatalabs-logo.png"
            alt="genzdatalabs Immigration Consulting Inc"
            width={200}
            height={64}
            priority
            unoptimized
            className="h-8 w-auto"
          />
        </Link>
        {center}
        <div className="ml-auto flex flex-none items-center gap-2">{actions}</div>
      </nav>
    </div>
  );
}

// Hero gradient band with soft radial cloud highlights.
export function HeroBand({
  children,
  deep = false,
}: {
  children: React.ReactNode;
  deep?: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        background: deep
          ? "linear-gradient(180deg,#D5F3E6 0%,#E4F7EF 45%,#F0F1F6 80%,#FFFFFF 100%)"
          : "linear-gradient(180deg,#D5F3E6 0%,#E4F7EF 40%,#F0F1F6 75%,#FFFFFF 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 30% at 15% 70%,rgba(98,212,166,.22),transparent 70%),radial-gradient(45% 28% at 85% 62%,rgba(98,212,166,.18),transparent 70%),radial-gradient(35% 22% at 50% 85%,rgba(255,255,255,.12),transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

// Gradient CTA / feature block (radius 24) with corner highlight.
export function GradientBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl text-white",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg,#1E2136 0%,#2E3252 55%,#3B4066 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 50% at 90% 90%,rgba(98,212,166,.45),transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

export function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_40px_80px_-40px_rgba(27,54,93,.5)]">
      <div className="flex items-center gap-2 border-b border-[#D9E2EC] bg-[#F4F6F9] px-3.5 py-2.5">
        <span className="block h-2.5 w-2.5 rounded-full bg-[#D9E2EC]" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[#D9E2EC]" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[#D9E2EC]" />
        <span className="ml-3 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#5A6A85]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}
