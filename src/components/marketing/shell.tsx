import Link from "next/link";

import { dmMono, jakarta } from "./fonts";
import { MarketingFooter } from "./footer";
import { HeroBand, MarketingNav } from "./ui";

export type Crumb = { label: string; href?: string };

// THE public navbar: identical on every public page except the CRM
// landing (which keeps its firm-audience nav). Menu anchors are absolute
// so they work from subpages too.
export function SiteNav() {
  return (
    <MarketingNav
      center={
        <div className="hidden flex-wrap justify-center gap-5 text-[13px] font-semibold text-[#1E2136]/80 md:flex">
          <Link href="/#about" className="hover:text-[#1E2136]">About</Link>
          <Link href="/#services" className="hover:text-[#1E2136]">Services</Link>
          <Link href="/#study" className="hover:text-[#1E2136]">Study in Canada</Link>
          <Link href="/#testimonials" className="hover:text-[#1E2136]">Testimonials</Link>
          <Link href="/#contact" className="hover:text-[#1E2136]">Contact</Link>
        </div>
      }
      actions={
        <>
          <Link
            href="/immigration-crm-software"
            className="hidden px-3.5 py-2 text-[13px] font-semibold text-[#1E2136]/80 hover:text-[#1E2136] sm:block"
          >
            For firms
          </Link>
          <Link
            href="/book-an-appointment"
            className="rounded-lg bg-[#1E2136] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2E3252]"
          >
            Book a consultation
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
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#1E2136]/70">
      <Link href="/" className="hover:text-[#1E2136]">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.label} className="flex items-center gap-2">
          <span aria-hidden className="text-[#1E2136]/50">
            &rsaquo;
          </span>
          {i === crumbs.length - 1 || !c.href ? (
            <span className="rounded-full border border-[#1E2136]/15 bg-white/70 px-2.5 py-0.5 font-medium text-[#1E2136]">
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className="hover:text-[#1E2136]">
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
      <header className="relative flex flex-col items-start gap-3 px-6 pb-28 pt-28 text-[#1E2136] sm:pt-32">
        <div className="mx-auto w-full max-w-[1100px]">
          <Breadcrumb crumbs={crumbs} />
          <h1 className="mt-4 text-balance text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.08] tracking-[-.03em]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#1E2136]">
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
      className={`${jakarta.variable} ${dmMono.variable} marketing-radius flex min-h-dvh flex-col overflow-x-clip bg-white font-[family-name:var(--font-jakarta)] text-[#1E2136] antialiased`}
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
      <main className="relative z-10 -mt-8 flex-1 px-6">
        <div className="mx-auto w-full max-w-[1100px]">{children}</div>
      </main>
    </PublicChrome>
  );
}
