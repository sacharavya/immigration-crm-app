import Link from "next/link";

import { dmMono, instrumentSerif, jakarta } from "./fonts";
import { MarketingFooter } from "./footer";
import { MEDIA } from "./media";
import { MegaNav, type MenuItem } from "./nav";
import { Display, HeroBand } from "./ui";

export type Crumb = { label: string; href?: string };

// THE public navbar for every public page. The CRM landing is the site's
// home page, so the product sits in the menu and the consulting side is one
// panel across. Every entry points at something that exists — the anchors
// resolve on / and are absolute so they work from subpages too.
// Everything the product does, grouped the way a firm thinks about its work.
// Entries are derived from what is actually in the app: each one maps to a
// staff route or a client-facing portal that exists today. Anything not yet
// shipped carries a tag rather than being quietly listed as done.
//
// To add a feature: add a line. Tags are "In development" or "Planned"; omit
// the tag once it ships.
const MENU: MenuItem[] = [
  {
    label: "Platform",
    columns: [
      {
        heading: "Case management",
        links: [
          {
            label: "Case pipeline",
            href: "/#features",
            description:
              "Every active file by phase, from retainer to decision, with who owns it.",
          },
          {
            label: "Case requests",
            href: "/#how",
            description: "Triage incoming requests before they become files.",
          },
          {
            label: "Clients & leads",
            href: "/#features",
            description: "One record per person, with source, history and notes.",
          },
          {
            label: "Tasks & deadlines",
            href: "/#features",
            description: "What is due, who owns it, and what is blocking it.",
          },
          {
            label: "Checklists",
            href: "/#features",
            description: "Versioned document checklists per program and service.",
          },
        ],
      },
      {
        heading: "Documents & forms",
        links: [
          {
            label: "IRCC form autofill",
            href: "/#features",
            description: "Data entered once flows into every form on the file.",
          },
          {
            label: "Submission packages",
            href: "/#features",
            description:
              "Assembled in the browser, so documents never leave it.",
          },
          {
            label: "PDF tool",
            href: "/#features",
            description: "Merge, split, stamp and paginate without leaving the case.",
          },
          {
            label: "E-signature",
            href: "/#how",
            description: "Retainers and consultation agreements signed online.",
          },
          {
            label: "Client portal",
            href: "/#how",
            description:
              "Clients upload, sign and track progress from a single link.",
          },
          {
            label: "Officio & spreadsheet import",
            href: "/#faq",
            description: "Bring an existing practice across without re-keying.",
            tag: "In development",
          },
        ],
      },
      {
        heading: "Practice operations",
        links: [
          {
            label: "Appointments & booking",
            href: "/#features",
            description: "A public booking page, consultant calendars and reminders.",
          },
          {
            label: "Payments & invoicing",
            href: "/#features",
            description: "Fees, government charges and HST, with pay-by-link.",
          },
          {
            label: "Reports",
            href: "/#features",
            description: "Pipeline, revenue and approval rates across the firm.",
          },
          {
            label: "Compliance & audit log",
            href: "/#trust",
            description: "Every view, edit and export recorded for practice review.",
          },
          {
            label: "Team & permissions",
            href: "/#trust",
            description: "Roles, supervision hierarchies and per-case access.",
          },
          {
            label: "Referral partners",
            href: "/#features",
            description: "A scoped portal for agents, with no access to full files.",
          },
          {
            label: "OneDrive & SharePoint",
            href: "/#trust",
            description: "Keep documents in the firm's own Microsoft tenant.",
          },
          {
            label: "Google Drive storage",
            href: "/#trust",
            description: "The same document sync against Google Workspace.",
            tag: "Planned",
          },
        ],
      },
    ],
    featured: {
      image: MEDIA.productShot,
      title: "Alpha program",
      tag: "Open",
      body: "Free through alpha and beta, with a week of hands-on training. We onboard a small number of firms at a time.",
      href: "/#request",
    },
  },
  {
    label: "For applicants",
    columns: [
      {
        heading: "Work with the firm",
        links: [
          {
            label: "Immigration services",
            href: "/immigration-consulting",
            description:
              "A regulated Canadian firm guiding individuals and families.",
          },
          {
            label: "Book an appointment",
            href: "/book-an-appointment",
            description: "Consultation or case review with a licensed RCIC.",
          },
          {
            label: "About us",
            href: "/about-us",
            description:
              "Licensed by the CICC, working from Toronto and Kathmandu.",
          },
        ],
      },
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
      image: MEDIA.heroConsulting,
      title: "Your pathway to Canada",
      body: "One regulated consultant owns your file from the first call through to the decision.",
      href: "/immigration-consulting",
    },
  },
  { label: "Security", href: "/#trust" },
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
            className="rounded-[var(--radius)] bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-[var(--on-ink)] transition-opacity hover:opacity-90"
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
