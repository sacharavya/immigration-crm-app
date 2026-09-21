import {
  ArrowRight,
  Check,
  History,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { dmMono, fraunces } from "@/components/marketing/fonts";
import { MarketingFooter } from "@/components/marketing/footer";
import { MEDIA } from "@/components/marketing/media";
import { SiteNav } from "@/components/marketing/shell";
import {
  BrowserFrame,
  DarkSection,
  Display,
  Eyebrow,
  GradientBlock,
  HeroBand,
  PrimaryLink,
  SectionHead,
  WhiteLink,
} from "@/components/marketing/ui";

import { Faq } from "./_crm/faq";
import { RequestForm } from "./_crm/request-form";

export const metadata: Metadata = {
  title:
    "Immigration CRM Software for Canadian Firms | CaseBind",
  description:
    "Immigration case management software built inside a CICC-regulated firm: submission package builder, IRCC form autofill, client portal, compliance, billing, and Canadian data residency. Free through alpha and beta testing, with a week of hands-on training.",
};

const PROGRAMS = [
  "Express Entry",
  "PNP",
  "Work Permits",
  "Study Permits",
  "Family Sponsorship",
  "LMIA",
  "Citizenship",
  "Visitor Visas",
];

const CHECKLIST = [
  { label: "Passport", status: "Accepted", color: "#1F7A3E", filled: true },
  { label: "ECA report", status: "Accepted", color: "#1F7A3E", filled: true },
  { label: "IELTS results", status: "Uploaded", color: "var(--ink)", filled: false },
  { label: "Police certificate", status: "Requested", color: "#9A5B12", filled: false },
];

const DEADLINES = [
  { client: "Miguel Santos", what: "Work permit expiry", when: "6 days", dot: "#D32F2F" },
  { client: "Priya Anand", what: "Biometrics", when: "12 days", dot: "#D32F2F" },
  { client: "Fatima Al-Rashid", what: "Medical exam", when: "19 days", dot: "#C98A2B" },
  { client: "Chen Wei", what: "LMIA validity", when: "27 days", dot: "#C98A2B" },
];

const AUTOFILL = [
  ["FAMILY NAME", "ANAND", false],
  ["GIVEN NAME", "PRIYA", false],
  ["UCI", "1123-4456", true],
  ["DATE OF BIRTH", "1993-04-18", true],
] as const;

const PACKAGE_FILES = [
  ["01 Cover letter.pdf", "0.2 MB"],
  ["02 IMM 0008.pdf", "1.1 MB"],
  ["03 Passport + ECA.pdf", "2.4 MB"],
];

const PIPELINE = [
  { name: "Retainer", n: 2, cards: [{ name: "R. Gurung", type: "Study permit", pct: "10%", color: "var(--ink-faint)" }, { name: "S. Okafor", type: "Visitor", pct: "20%", color: "var(--ink-faint)" }] },
  { name: "Documents", n: 5, cards: [{ name: "P. Anand", type: "EE · CEC", pct: "75%", color: "var(--ink)" }, { name: "B. Khatiwada", type: "Family", pct: "60%", color: "var(--ink)" }] },
  { name: "Review", n: 1, cards: [{ name: "F. Al-Rashid", type: "Study permit", pct: "90%", color: "var(--ink)" }] },
  { name: "Submitted", n: 3, cards: [{ name: "M. Santos", type: "WP · LMIA", pct: "100%", color: "#E6CFA9" }, { name: "C. Wei", type: "Spousal", pct: "100%", color: "#E6CFA9" }] },
  { name: "Decision", n: 9, cards: [{ name: "A. Mainali", type: "PNP · Approved", pct: "100%", color: "#1F7A3E" }, { name: "D. Khatiwada", type: "Business · Refused", pct: "100%", color: "#D32F2F" }] },
];

const PORTAL_DOCS = [
  { doc: "Passport (all pages)", date: "Sep 2", status: "Accepted", bg: "#DDF3E4", fg: "#1F7A3E" },
  { doc: "ECA report - WES", date: "Sep 4", status: "Accepted", bg: "#DDF3E4", fg: "#1F7A3E" },
  { doc: "IELTS test report", date: "Sep 8", status: "Under review", bg: "var(--paper)", fg: "var(--ink)" },
  { doc: "Police certificate", date: "—", status: "Requested", bg: "#FBEBD9", fg: "#9A5B12" },
  { doc: "Retainer agreement", date: "Aug 28", status: "Signed", bg: "#DDF3E4", fg: "#1F7A3E" },
];

const AUDIT_ROWS = [
  { t: "09:41", what: "Retainer signed · BB-2026-0041", who: "P. Anand" },
  { t: "09:12", what: "Package exported to OneDrive", who: "S. Acharya" },
  { t: "08:55", what: "Trust deposit recorded · $1,500", who: "M. Khan" },
  { t: "Yesterday", what: "Conflict check passed · new lead", who: "System" },
];

const BENEFITS = [
  { Icon: Sparkles, title: "Canadian data residency", body: "Stored and processed inside Canada, nowhere else." },
  { Icon: Lock, title: "Client-side PDF processing", body: "Documents are assembled in the browser and never leave it." },
  { Icon: ShieldCheck, title: "Row-level security", body: "Access scoped per firm and per case, encrypted at rest." },
  { Icon: History, title: "Full audit log", body: "Every view, edit and export recorded for practice review." },
  { Icon: Star, title: "Inference-only AI", body: "Completeness and consistency checks with no training on client data." },
  { Icon: Package, title: "Your data, exportable", body: "Leave any time with a complete export; we delete what remains." },
];

const APPTS = [
  { mon: "SEP", day: "14", time: "10:30 a.m.", name: "Priya Anand", type: "PR consultation · Online" },
  { mon: "SEP", day: "15", time: "2:00 p.m.", name: "Miguel Santos", type: "Work permit renewal · In person" },
  { mon: "SEP", day: "17", time: "11:00 a.m.", name: "New lead", type: "Initial consultation · Online" },
];

// Feature card shell: the UI snippet sits on a sunken well, the caption on
// paper below it — no pastel wash, so the product screenshot is the only
// thing carrying colour.
function FeatureCard({
  number,
  title,
  body,
  children,
}: {
  number: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--paper-raised)]">
      <div className="flex min-h-[210px] flex-col gap-2 border-b border-[var(--rule)] bg-[var(--paper)] p-5.5">
        {children}
      </div>
      <div className="flex flex-col gap-2 px-5.5 pb-6 pt-5">
        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[.18em] text-[var(--ink-faint)]">
          {number}
        </div>
        <Display className="text-[22px]">{title}</Display>
        <p className="text-[13.5px] leading-relaxed text-[var(--ink-muted)]">{body}</p>
      </div>
    </div>
  );
}

export default function CrmLandingPage() {
  return (
    <main
      className={`${dmMono.variable} ${fraunces.variable} marketing-radius flex min-h-dvh flex-col overflow-x-clip bg-[var(--paper)] font-[family-name:var(--font-inter)] text-[var(--ink)] antialiased`}
    >
      <SiteNav />
      <HeroBand>
        <header className="relative px-6 pt-20 text-[var(--ink)] sm:pt-28">
          <div className="mx-auto grid w-full max-w-[1180px] items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-[var(--ink-muted)]">
                <span className="rounded-[3px] bg-[var(--slab)] px-1.5 py-0.5 text-[10px] text-white">
                  ALPHA
                </span>
                Built inside a CICC-regulated firm · Toronto
              </span>
              <Display as="h1" className="text-balance text-[clamp(40px,6vw,76px)]">
                The all-in-one CRM for Canadian immigration practices
              </Display>
            </div>
            <div className="flex flex-col items-start gap-6 lg:pb-3">
              <p className="max-w-[420px] text-[16px] leading-relaxed text-[var(--ink-muted)]">
                Case management, IRCC forms, submission packages, compliance and
                billing in one place — hosted in Canada, used daily by our own
                consultants.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <PrimaryLink href="#request">
                  Request alpha access <ArrowRight className="h-4 w-4" />
                </PrimaryLink>
                <WhiteLink href="#features">See what&apos;s inside</WhiteLink>
              </div>
              <div className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase leading-relaxed tracking-[.14em] text-[var(--ink-faint)]">
                Free through alpha &amp; beta · One week of hands-on training ·
                Canadian data residency
              </div>
            </div>
          </div>

          {/* The product is the hero image: full width, bleeding past the
              fold so the page opens on the real thing. */}
          <div className="relative z-[1] mx-auto mt-16 w-full max-w-[1180px] text-[var(--ink)]">
            <BrowserFrame url="app.genzdatalabs.com/dashboard">
              <Image
                src="/dashboard-preview.png"
                alt="CaseBind dashboard"
                width={2778}
                height={1706}
                priority
                unoptimized
                className="block h-auto w-full"
              />
            </BrowserFrame>
          </div>
        </header>
      </HeroBand>

      {/* Programs strip */}
      <section className="flex flex-col items-center gap-5 px-6 pt-14">
        <div className="text-[13px] text-[var(--ink-muted)]">
          Purpose-built for every stream our practice files
        </div>
        <div className="flex max-w-[900px] flex-wrap justify-center gap-2.5">
          {PROGRAMS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-[var(--rule)] bg-[var(--paper-raised)] px-3.5 py-2 text-[13px] font-semibold"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="flex flex-col items-center gap-4 px-6 pt-28">
        <SectionHead
          eyebrow="STAY IN CONTROL"
          title="Every case, document and deadline in one place."
          subline="Data entered once flows into every form, package and invoice."
        />
        <div className="mt-10 grid w-full max-w-[1120px] grid-cols-1 gap-4 md:grid-cols-2">
          <FeatureCard
            number="01"
            title="Track every document"
            body="Checklists per application type drive collection, status and assembly order."
          >
            <div className="flex justify-between text-xs font-bold">
              <span>Checklist · Express Entry CEC</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium text-[var(--ink-muted)]">
                18/24
              </span>
            </div>
            {CHECKLIST.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs"
              >
                <span
                  className="h-3 w-3 border"
                  style={{
                    borderColor: "var(--ink)",
                    background: c.filled ? "var(--ink)" : "#fff",
                  }}
                />
                <span className="flex-1">{c.label}</span>
                <span className="text-[10.5px] font-semibold" style={{ color: c.color }}>
                  {c.status}
                </span>
              </div>
            ))}
          </FeatureCard>

          <FeatureCard
            number="02"
            title="Never miss an expiry"
            body="Permits, biometrics, medicals and LMIA dates tracked with reminders."
          >
            <div className="text-xs font-bold">Expiring in 30 days</div>
            {DEADLINES.map((d) => (
              <div
                key={d.client}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs"
              >
                <span className="h-1.5 w-1.5" style={{ background: d.dot }} />
                <span className="flex-1">
                  <strong>{d.client}</strong> · {d.what}
                </span>
                <span
                  className="font-[family-name:var(--font-dm-mono)] text-[10.5px]"
                  style={{ color: d.dot }}
                >
                  {d.when}
                </span>
              </div>
            ))}
          </FeatureCard>

          <FeatureCard
            number="03"
            title="Forms fill themselves"
            body="IMM forms and portals populated from a single client profile."
          >
            <div className="text-xs font-bold">IMM 0008 · Autofill</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {AUTOFILL.map(([k, v, mono]) => (
                <div
                  key={k}
                  className="rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-2 py-1.5"
                >
                  <div className="text-[9.5px] text-[var(--ink-muted)]">{k}</div>
                  <div
                    className={`font-semibold ${mono ? "font-[family-name:var(--font-dm-mono)]" : ""}`}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink)]">
              <Check className="h-3 w-3" strokeWidth={2.5} />
              92 fields filled from client profile
            </div>
          </FeatureCard>

          <FeatureCard
            number="04"
            title="Assemble to portal limits"
            body="Merge, compress and bookmark in one click; output to OneDrive with versioning."
          >
            <div className="text-xs font-bold">Submission package</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[var(--slab)] px-2 py-0.5 text-[10.5px] text-white">
                IRCC 4 MB
              </span>
              <span className="rounded-full border border-[var(--rule)] bg-[var(--paper-raised)] px-2 py-0.5 text-[10.5px]">
                OINP 10 MB
              </span>
              <span className="rounded-full border border-[var(--rule)] bg-[var(--paper-raised)] px-2 py-0.5 text-[10.5px]">
                Email 20 MB
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[11.5px]">
              {PACKAGE_FILES.map(([name, size]) => (
                <div
                  key={name}
                  className="flex justify-between rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-2 py-1.5"
                >
                  <span>{name}</span>
                  <span className="text-[var(--ink-muted)]">{size}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 text-[11px]">
              <div className="h-1.5 flex-1 bg-[#E3EAF3]">
                <div className="h-full w-[93%] bg-[var(--slab)]" />
              </div>
              <span className="font-[family-name:var(--font-dm-mono)]">3.7 / 4 MB</span>
            </div>
          </FeatureCard>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="flex flex-col items-center gap-4 px-6 pt-28">
        <SectionHead
          eyebrow="WORK THE WAY YOU FILE"
          title="Built around how a practice actually runs."
          subline="Three views your team will live in."
        />
        <div className="mt-10 flex w-full max-w-[1120px] flex-col gap-4">
          {/* Cases */}
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-3.5 p-8 sm:p-11">
              <span className="self-start rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)]">
                Cases
              </span>
              <Display className="text-[26px]">
                Pipeline board from retainer to decision
              </Display>
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                Every active case by phase, with who owns it and what&apos;s
                blocking it. Click a card to open the file.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)] hover:text-[var(--ink)]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
            <div
              className="grid min-h-[300px] grid-cols-5 content-start gap-2 border-t border-[var(--rule)] p-7 lg:border-l lg:border-t-0"
            >
              {PIPELINE.map((s) => (
                <div key={s.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between px-0.5 text-[10px] font-bold text-[var(--ink-muted)]">
                    <span className="truncate">{s.name}</span>
                    <span className="font-[family-name:var(--font-dm-mono)]">{s.n}</span>
                  </div>
                  {s.cards.map((k) => (
                    <div
                      key={k.name}
                      className="flex flex-col gap-1 rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] p-2"
                    >
                      <div className="text-[10.5px] font-semibold leading-tight">
                        {k.name}
                      </div>
                      <div className="text-[9px] text-[var(--ink-muted)]">{k.type}</div>
                      <div className="h-[3px] bg-[#E3EAF3]">
                        <div
                          className="h-full"
                          style={{ background: k.color, width: k.pct }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Client portal */}
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] lg:grid-cols-2">
            <div
              className="order-2 flex min-h-[300px] flex-col gap-2 border-t border-[var(--rule)] p-7 lg:order-1 lg:border-r lg:border-t-0"
            >
              <div className="flex justify-between text-xs font-bold">
                <span>Client portal · Priya Anand</span>
                <span className="rounded-full bg-[var(--paper)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--ink)]">
                  Signed in
                </span>
              </div>
              {PORTAL_DOCS.map((p) => (
                <div
                  key={p.doc}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-3 py-2 text-xs"
                >
                  <span>{p.doc}</span>
                  <span className="text-[10.5px] text-[var(--ink-muted)]">{p.date}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
              <div className="mt-auto rounded-[10px] border border-dashed border-[var(--ink)] bg-[var(--paper-raised)] p-3 text-center text-[11.5px] text-[var(--ink-muted)]">
                Drop files here or <strong className="text-[var(--ink)]">browse</strong>
              </div>
            </div>
            <div className="order-1 flex flex-col justify-center gap-3.5 p-8 sm:p-11 lg:order-2">
              <span className="self-start rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)]">
                Client portal
              </span>
              <Display className="text-[26px]">
                Clients upload, sign and track from one link
              </Display>
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                Per-document status, intake questionnaires with conditional
                logic and e-signed retainers — no more email chains.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)] hover:text-[var(--ink)]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
          </div>

          {/* Compliance */}
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-3.5 p-8 sm:p-11">
              <span className="self-start rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)]">
                Compliance
              </span>
              <Display className="text-[26px]">
                Audit-ready by default, not the week before review
              </Display>
              <p className="text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                Retainers tied to the CICC Code, supervision hierarchies, trust
                records and a full access log — exportable in one click.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)] hover:text-[var(--ink)]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
            <div
              className="flex min-h-[300px] flex-col gap-2.5 border-t border-[var(--rule)] p-7 lg:border-l lg:border-t-0"
            >
              <div className="text-xs font-bold">Practice record · Q3 2026</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["RETAINERS", "142", "100% signed", "#1F7A3E"],
                  ["TRUST BALANCE", "$48.2k", "reconciled Sep 9", "var(--ink-muted)"],
                  ["CONFLICTS", "0", "checked at intake", "var(--ink-muted)"],
                ].map(([k, v, s, c]) => (
                  <div key={k} className="rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] p-3">
                    <div className="text-[9.5px] tracking-[.08em] text-[var(--ink-muted)]">{k}</div>
                    <div className="mt-0.5 text-xl font-extrabold">{v}</div>
                    <div className="text-[10px] font-semibold" style={{ color: c }}>
                      {s}
                    </div>
                  </div>
                ))}
              </div>
              {AUDIT_ROWS.map((a) => (
                <div
                  key={a.t + a.what}
                  className="grid grid-cols-[auto_1fr_auto] gap-2.5 rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] px-3 py-2 text-[11.5px]"
                >
                  <span className="font-[family-name:var(--font-dm-mono)] text-[var(--ink-muted)]">
                    {a.t}
                  </span>
                  <span>{a.what}</span>
                  <span className="text-[var(--ink-muted)]">{a.who}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits — cut to dark. The page is otherwise one long paper
          field, and the trust claims are what deserve the contrast. */}
      <DarkSection id="trust" className="mt-28 py-28" image={MEDIA.securityBackdrop}>
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="flex flex-col gap-5 lg:sticky lg:top-28">
            <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-white/45">
              Achieve more with less effort
            </span>
            <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(32px,3.6vw,50px)] leading-[1.0] tracking-[-0.02em]">
              Secure, compliant, and yours to keep.
            </h2>
            <p className="max-w-[34ch] text-[14px] leading-relaxed text-white/60">
              Hosted in Canada, built to the CICC Code.
            </p>
          </div>

          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {BENEFITS.map(({ Icon, title, body }, i) => (
              <div key={title} className="flex flex-col gap-3 border-t border-white/12 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-[var(--gold)]" strokeWidth={1.5} />
                  <span className="font-[family-name:var(--font-dm-mono)] text-[11px] tabular-nums text-white/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="font-[family-name:var(--font-display)] text-[23px] leading-[1.08] tracking-[-0.02em]">
                  {title}
                </div>
                <p className="text-[13.5px] leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </DarkSection>

      {/* FAQ */}
      <section id="faq" className="flex flex-col items-center gap-4 px-6 pt-28">
        <SectionHead
          eyebrow="ALPHA PROGRAM"
          title="Frequently asked questions"
          subline="What alpha firms get, and what we ask in return."
        />
        <Faq />
      </section>

      {/* CTA */}
      <section className="px-6 pt-28">
        <GradientBlock className="mx-auto grid max-w-[1120px] items-center gap-10 p-8 sm:p-14 lg:grid-cols-2">
          <div className="relative flex flex-col gap-4">
            <span className="self-start rounded-full border border-white/50 bg-white/20 px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] tracking-[.16em]">
              FREE THROUGH ALPHA &amp; BETA
            </span>
            <Display className="text-balance text-[clamp(32px,4vw,54px)]">
              A smarter way to run your practice
            </Display>
            <p className="max-w-[440px] text-[15px] leading-relaxed text-white/90">
              We onboard a small number of firms at a time and reach out to
              schedule your training week.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <PrimaryLink href="#request" tone="red">
                Request alpha access <ArrowRight className="h-4 w-4" />
              </PrimaryLink>
              <WhiteLink href="mailto:info@genzdatalabs.com">
                Talk to us
              </WhiteLink>
            </div>
          </div>
          <div className="on-light relative flex flex-col gap-3 rounded-2xl border border-white/80 bg-[var(--paper-raised)] p-5 text-[var(--ink)] shadow-[0_30px_60px_-30px_rgba(27,54,93,.5)]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold">Upcoming appointments</div>
              <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--ink)]">
                3
              </span>
            </div>
            {APPTS.map((a) => (
              <div
                key={a.day}
                className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[10px] border border-[var(--rule)] px-3 py-2.5"
              >
                <div className="bg-[var(--paper)] py-1.5 text-center">
                  <div className="text-[9px] font-bold text-[var(--ink)]">{a.mon}</div>
                  <div className="text-base font-extrabold leading-none">{a.day}</div>
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold">
                    {a.time} · {a.name}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)]">{a.type}</div>
                </div>
                <span className="rounded-md border border-[var(--rule)] px-2.5 py-1 text-[11px] font-semibold">
                  View
                </span>
              </div>
            ))}
          </div>
        </GradientBlock>
      </section>

      {/* Request access form */}
      <section id="request" className="mx-auto w-full max-w-3xl px-6 pb-28 pt-28">
        <div className="flex flex-col items-center gap-4 text-center">
          <Eyebrow>REQUEST ACCESS</Eyebrow>
          <Display className="text-balance text-[clamp(30px,3.8vw,48px)]">
            Request alpha access
          </Display>
          <p className="max-w-xl text-base text-[var(--ink-muted)]">
            Tell us about your firm. We onboard a small number of firms at a
            time and will reach out to schedule your training week.
          </p>
        </div>
        <div className="mt-8">
          <RequestForm />
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
