import { GenzLogo } from "@/components/brand/genz-logo";
import Link from "next/link";

// THE shared footer for every public page. Audience-neutral columns so the
// same component serves the home page, the CRM landing, booking, tools,
// and legal pages. A dark slab closes the paper canvas and carries the last
// call to action, so no separate CTA section is needed above it.

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "Services", href: "/#services" },
      { label: "Book an appointment", href: "/book-an-appointment" },
      { label: "CRS Calculator", href: "/crs-calculator" },
      { label: "Find your NOC Code", href: "/find-your-noc-code" },
      { label: "Find a pathway", href: "/find-a-pathway" },
    ],
  },
  {
    heading: "Firm",
    links: [
      { label: "About us", href: "/about-us" },
      { label: "CRM for firms", href: "/" },
      { label: "Immigration services", href: "/immigration-consulting" },
      { label: "Staff login", href: "/login" },
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
];

export function MarketingFooter() {
  return (
    <footer className="on-dark mt-auto bg-[var(--slab)] text-white">
      <div className="mx-auto w-full max-w-[1180px] px-6 py-16">
        {/* Closing call to action, sitting on the same rule as the columns. */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 pb-12 sm:flex-row sm:items-center">
          <h2 className="max-w-xl text-balance font-[family-name:var(--font-display)] text-[clamp(26px,3.2vw,40px)] font-normal leading-[1.02] tracking-[-0.02em]">
            Your pathway to Canada starts with one conversation.
          </h2>
          <Link
            href="/book-an-appointment"
            className="shrink-0 rounded-[var(--radius)] bg-white px-5 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--gold)]"
          >
            Book a consultation
          </Link>
        </div>

        <div className="grid gap-10 pt-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <GenzLogo tone="dark" className="h-8 w-auto self-start" />
            <p className="max-w-[300px] text-[13px] leading-relaxed text-white/55">
              A regulated Canadian immigration firm.
              <br />
              211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5
              <br />
              +1 (416) 386-5351 · info@genzdatalabs.com
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3 text-[13px]">
              <div className="font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium uppercase tracking-[.18em] text-white/40">
                {col.heading}
              </div>
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-white/70 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-[11.5px] text-white/40">
          <span>© 2026 genzdatalabs Immigration Consulting Inc.</span>
          <span>
            Licensed by the College of Immigration and Citizenship Consultants
            (CICC) · RCIC# R7111111
          </span>
        </div>
      </div>
    </footer>
  );
}
