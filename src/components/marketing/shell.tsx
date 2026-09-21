import Link from "next/link";

import { dmMono, fraunces } from "./fonts";
import { MarketingFooter } from "./footer";
import { MEDIA } from "./media";
import { PLATFORM_COLUMNS, SOLUTIONS } from "./features";
import { MegaNav, type MenuItem } from "./nav";
import { Display, HeroBand } from "./ui";

export type Crumb = { label: string; href?: string };

// THE public navbar for every public page. The CRM landing is the site's
// home page, so the product sits in the menu and the consulting side is one
// panel across. Every entry points at something that exists — the anchors
// resolve on / and are absolute so they work from subpages too.
// The feature list itself lives in features.ts.
const MENU: MenuItem[] = [
  {
    label: "Platform",
    columns: PLATFORM_COLUMNS,
    featured: {
      image: MEDIA.productShot,
      title: "Everything on the platform",
      body: "Every feature, grouped the way a firm works, with what is shipped and what is next.",
      href: "/platform",
    },
  },
  {
    label: "Solutions",
    // Two columns of three; one column of six runs off a laptop screen.
    columns: [SOLUTIONS.slice(0, 3), SOLUTIONS.slice(3)].map((half, i) => ({
      heading: i === 0 ? "The problem" : "and where the platform answers it",
      links: half.map((x) => ({
        label: x.problem,
        href: `/solutions#${x.slug}`,
        description: x.solution,
      })),
    })),
    featured: {
      image: MEDIA.productShot,
      title: "All solutions",
      body: "Six things that go wrong in a practice, and the part of the platform built for each.",
      href: "/solutions",
    },
  },
  { label: "Firms", href: "/firms" },
  {
    label: "Resources",
    columns: [
      {
        heading: "Free tools",
        links: [
          {
            label: "CRS Calculator",
            href: "/crs-calculator",
            description: "Estimate your Express Entry ranking score.",
          },
          {
            label: "Find a pathway",
            href: "/find-a-pathway",
            description: "Match your profile to the right immigration program.",
          },
          {
            label: "Find your NOC code",
            href: "/find-your-noc-code",
            description:
              "Check whether your occupation still qualifies for a SOWP.",
          },
        ],
      },
      {
        heading: "Legal",
        links: [
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Data Usage", href: "/data-usage" },
          { label: "Terms of Use", href: "/terms" },
        ],
      },
    ],
    featured: {
      image: MEDIA.pathwaysBackdrop,
      title: "Free tools for applicants",
      body: "Your clients can check their CRS score, pathway and NOC code before they ever book.",
      href: "/crs-calculator",
    },
  },
  {
    label: "Company",
    columns: [
      {
        links: [
          {
            label: "About",
            href: "/about",
            description: "Who we are and what we're building.",
          },
          {
            label: "Careers",
            href: "/careers",
            description: "Help build the case management platform Canadian immigration firms run on.",
          },
        ],
      },
      {
        links: [
          {
            label: "Goals & vision",
            href: "/about#vision",
            description: "Where the platform is going, and what it will never do.",
          },
          {
            label: "Compliance",
            href: "/#trust",
            description: "Canadian data residency, audit trail, your own document storage.",
          },
        ],
      },
    ],
    featured: {
      image: MEDIA.productShot,
      title: "Built inside a regulated firm",
      body: "CaseBind grew out of a CICC-regulated practice in Toronto, used daily by its own consultants.",
      href: "/about",
    },
  },
];

export function SiteNav() {
  return (
    <MegaNav
      items={MENU}
      announcement={{
        text: "CaseBind is open to a small group of alpha firms.",
        href: "/#request",
      }}
      actions={
        <>
          <Link
            href="/login"
            className="hidden rounded-[var(--radius)] border border-[var(--ink)]/20 px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]/40 sm:block"
          >
            Login
          </Link>
          <Link
            href="/#request"
            className="rounded-[var(--radius)] bg-[var(--slab)] px-3.5 py-2 text-[13px] font-semibold text-[var(--on-ink)] transition-opacity hover:opacity-90"
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
      className={`${dmMono.variable} ${fraunces.variable} marketing-radius flex min-h-dvh flex-col overflow-x-clip bg-[var(--paper)] font-[family-name:var(--font-inter)] text-[var(--ink)] antialiased`}
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
