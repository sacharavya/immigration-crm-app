import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/index";

// Shared primitives for the marketing visual system (home + CRM landing).
// Tokens from the design handoff: navy #1B365D text, primary #3D6FD8,
// border #D9E2EC, secondary text #5A6A85, hero gradient blues.

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#E9F0FC] px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium uppercase tracking-[.16em] text-[#3D6FD8]">
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
          ? "bg-[#3D6FD8] shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] hover:bg-[#2F5BC0]"
          : "bg-[#D32F2F] shadow-[0_12px_30px_-14px_rgba(211,47,47,.7)] hover:bg-[#1B365D]",
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
        "inline-flex items-center gap-2 rounded-[10px] bg-white/95 px-5 py-3 text-sm font-semibold text-[#1B365D] transition-colors hover:bg-white",
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
    <div className="relative flex justify-center px-6 pt-5">
      <nav className="flex w-full max-w-[1100px] items-center justify-between gap-5 rounded-[14px] border border-white/70 bg-white/95 py-2.5 pl-4 pr-3 shadow-[0_8px_30px_-18px_rgba(27,54,93,.35)]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration Consulting Inc"
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
          ? "linear-gradient(180deg,#4F7FE6 0%,#5F8CEA 55%,#7FA4F0 78%,#B9C9F5 92%,#FFFFFF 100%)"
          : "linear-gradient(180deg,#4F7FE6 0%,#7FA4F0 42%,#DCE6FA 78%,#FFFFFF 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 30% at 15% 70%,rgba(255,255,255,.55),transparent 70%),radial-gradient(45% 28% at 85% 62%,rgba(255,255,255,.5),transparent 70%),radial-gradient(35% 22% at 50% 85%,rgba(240,225,250,.6),transparent 70%)",
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
          "linear-gradient(135deg,#4F7FE6 0%,#7FA4F0 55%,#B9C9F5 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 50% at 90% 90%,rgba(255,255,255,.35),transparent 70%)",
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
