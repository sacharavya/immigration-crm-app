import { GenzLogo } from "@/components/brand/genz-logo";
import Link from "next/link";

import { cn } from "@/lib/utils/index";

// Shared primitives for the marketing visual system (home + CRM landing).
// The register is editorial: a serif display face over a paper canvas, ink
// in brand navy, hairline rules instead of borders, and mint rationed to
// small marks. Tokens live on .marketing-radius in globals.css.

// Headline face. Every h1/h2 on the public pages goes through this so the
// serif never leaks into body copy, where it would hurt readability.
export function Display({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-[family-name:var(--font-display)] font-normal tracking-[-0.02em] text-[var(--ink)]",
        className,
        // Last, deliberately: tailwind-merge treats an arbitrary text-[…] size
        // as conflicting with leading-*, so a caller's font-size class would
        // otherwise strip the tight display leading.
        "leading-[0.98]",
      )}
    >
      {children}
    </Tag>
  );
}

// A plain lettered label, not a filled pill. The mint tick is the only
// colour most sections carry.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium uppercase tracking-[.18em] text-[var(--ink-muted)]">
      <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-[var(--gold)]" />
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  subline,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  subline?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Display className="max-w-3xl text-balance text-[clamp(32px,4.4vw,52px)]">
        {title}
      </Display>
      {subline && (
        <p
          className={cn(
            "max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]",
            align === "center" && "mx-auto",
          )}
        >
          {subline}
        </p>
      )}
    </div>
  );
}

// Small, square-ish, solid. Deliberately understated next to the display type.
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
        "inline-flex items-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-[13px] font-semibold transition-colors",
        tone === "primary"
          ? "bg-[var(--ink)] text-[var(--on-ink)] hover:opacity-90"
          : "bg-[var(--gold)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white",
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
        "inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--ink)]/20 bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]/40 hover:bg-[var(--ink)]/[0.03]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

// Thin flat top bar. The previous floating glass pill read as consumer SaaS;
// a full-width rule sitting on the paper reads as a firm.
export function MarketingNav({
  center,
  actions,
}: {
  center?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[var(--paper)]/90 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <GenzLogo className="h-7 w-auto text-[#1E2136]" />
        </Link>
        {center}
        <div className="ml-auto flex flex-none items-center gap-1.5">{actions}</div>
      </nav>
    </div>
  );
}

// Flat paper band. No gradient: the hero earns attention through type and
// space, and the product shot below supplies the only large visual.
export function HeroBand({
  children,
  deep = false,
}: {
  children: React.ReactNode;
  // Kept for call-site compatibility; the band is flat either way.
  deep?: boolean;
}) {
  void deep;
  return <div className="relative bg-[var(--paper)]">{children}</div>;
}

// Dark slab for feature and CTA blocks. Flat navy with one soft mint bloom
// in a corner — the single place mint is allowed to spread.
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
        "on-dark relative overflow-hidden rounded-[calc(var(--radius)*2)] bg-[var(--slab)] text-white",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 70% at 100% 100%,rgba(98,212,166,.16),transparent 70%)",
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
    <div className="overflow-hidden rounded-[calc(var(--radius)*1.5)] border border-[var(--rule)] bg-white shadow-[0_40px_80px_-48px_rgba(30,33,54,.45)]">
      <div className="flex items-center gap-2 border-b border-[var(--rule)] bg-[var(--paper)] px-3.5 py-2.5">
        <span className="block h-2.5 w-2.5 rounded-full bg-[var(--rule)]" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[var(--rule)]" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[var(--rule)]" />
        <span className="ml-3 font-[family-name:var(--font-dm-mono)] text-[11px] text-[var(--ink-faint)]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

// Harvey's three-up: a visual panel on top, then title and copy sitting
// directly on the paper with no card chrome around them.
export function FeatureColumn({
  panel,
  title,
  children,
}: {
  panel: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--radius)*1.5)] bg-[var(--slab)]">
        {panel}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-bold text-[var(--ink)]">{title}</h3>
        <p className="text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          {children}
        </p>
      </div>
    </div>
  );
}

// Full-width hairline, the main structural device between sections.
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-[var(--rule)]", className)} />;
}

// Full-bleed dark band. The page's rhythm depends on these: paper, then a
// hard cut to near-black, then paper again. Without the cut everything reads
// as one undifferentiated field.
export function DarkSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("on-dark grain relative overflow-hidden bg-[var(--slab)] text-white", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%,rgba(98,212,166,.10),transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1180px] px-6">{children}</div>
    </section>
  );
}

// The set sits faded with one entry in focus; pointing at any entry moves the
// focus. Behaviour is pure CSS (see .fw rules in globals.css) so this stays a
// server component.
export function FocusList({
  items,
  activeIndex = 0,
  className,
}: {
  items: { label: string; href: string }[];
  activeIndex?: number;
  className?: string;
}) {
  return (
    <div className={cn("fw-list flex flex-col", className)}>
      {items.map((item, i) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "fw font-[family-name:var(--font-display)] text-[clamp(30px,5.2vw,64px)] leading-[1.12] tracking-[-0.02em]",
            i === activeIndex && "fw-active",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

// A dark editorial panel whose artwork bleeds off the bottom edge, so the
// card reads as a window onto something larger rather than a contained box.
export function BleedPanel({
  eyebrow,
  title,
  body,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="on-dark grain relative flex flex-col overflow-hidden rounded-[calc(var(--radius)*2)] bg-[var(--slab)] text-white">
      <div className="relative flex flex-col items-start gap-4 px-8 pt-9">
        <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-white/45">
          {eyebrow}
        </span>
        <h3 className="max-w-[16ch] text-balance font-[family-name:var(--font-display)] text-[clamp(26px,2.6vw,36px)] leading-[1.02] tracking-[-0.02em]">
          {title}
        </h3>
        <p className="max-w-[40ch] text-[13.5px] leading-relaxed text-white/60">{body}</p>
        {action}
      </div>
      {/* Bleeds right and bottom, clipped by the panel. */}
      <div className="relative mt-9 -mb-px ml-8 overflow-hidden rounded-tl-[calc(var(--radius)*1.5)] border-l border-t border-white/12">
        {children}
      </div>
    </div>
  );
}
