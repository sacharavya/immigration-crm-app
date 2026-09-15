import Link from "next/link";

import { dmMono, instrumentSerif, jakarta } from "./fonts";
import { MarketingFooter } from "./footer";
import { Display, HeroBand, MarketingNav } from "./ui";

export type Crumb = { label: string; href?: string };

// THE public navbar for every public page. The CRM landing is the site's
// home page, so the nav is the product's: its anchors resolve on / and read
// as absolute links so they also work from subpages.
export function SiteNav() {
  return (
    <MarketingNav
      center={
        <div className="hidden flex-wrap justify-center gap-6 text-[13px] font-medium text-[var(--ink-muted)] md:flex">
          <Link href="/#features" className="transition-colors hover:text-[var(--ink)]">
            Features
          </Link>
          <Link href="/#how" className="transition-colors hover:text-[var(--ink)]">
            How it works
          </Link>
          <Link href="/#trust" className="transition-colors hover:text-[var(--ink)]">
            Security
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-[var(--ink)]">
            FAQ
          </Link>
        </div>
      }
      actions={
        <>
          <Link
            href="/immigration-consulting"
            className="hidden rounded-[var(--radius)] border border-[var(--ink)]/20 px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]/40 sm:block"
          >
            For applicants
          </Link>
          <Link
            href="/#request"
            className="rounded-[var(--radius)] bg-[var(--gold)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
          >
            Request access
          </Link>
        </>
      }
    />
  );
}

// Breadcrumb inside the gradient band: Home > Section > Current, last item
// as a translucent white pill.
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[.12em] text-[var(--ink-faint)]">
      <Link href="/" className="transition-colors hover:text-[var(--ink)]">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.label} className="flex items-center gap-2">
          <span aria-hidden className="text-[var(--rule)]">/</span>
          {i === crumbs.length - 1 || !c.href ? (
            <span className="text-[var(--ink)]">{c.label}</span>
          ) : (
            <Link href={c.href} className="transition-colors hover:text-[var(--ink)]">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// Gradient band with breadcrumb + title. Pure (no hooks), so client
// components like the booking flow can render it with step-driven content.
export function BandHeader({
  crumbs,
  title,
  subtitle,
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
}) {
  return (
    <HeroBand>
      <header className="relative flex flex-col items-start gap-3 border-b border-[var(--rule)] px-6 pb-16 pt-20 text-[var(--ink)] sm:pt-24">
        <div className="mx-auto w-full max-w-[1180px]">
          <Breadcrumb crumbs={crumbs} />
          <Display as="h1" className="mt-5 max-w-3xl text-balance text-[clamp(34px,5vw,60px)]">
            {title}
          </Display>
          {subtitle && (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </header>
    </HeroBand>
  );
}

// Nav + footer only; the page owns everything between (the booking flow
// renders its own step-driven BandHeader).
export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${jakarta.variable} ${dmMono.variable} ${instrumentSerif.variable} marketing-radius flex min-h-dvh flex-col overflow-x-clip bg-[var(--paper)] font-[family-name:var(--font-jakarta)] text-[var(--ink)] antialiased`}
    >
      <SiteNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

// Shared chrome for public subpages with a static title: sticky glass nav,
// gradient breadcrumb band, content, shared footer.
export function MarketingShell({
  crumbs,
  title,
  subtitle,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicChrome>
      <BandHeader crumbs={crumbs} title={title} subtitle={subtitle} />
      <main className="relative z-10 flex-1 px-6 pt-16">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </main>
    </PublicChrome>
  );
}
