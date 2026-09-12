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
import Link from "next/link";

import { dmMono, jakarta } from "@/components/marketing/fonts";
import {
  BrowserFrame,
  Eyebrow,
  GradientBlock,
  HeroBand,
  MarketingNav,
  PrimaryLink,
  SectionHead,
  WhiteLink,
} from "@/components/marketing/ui";

import { Faq } from "./_components/faq";
import { RequestForm } from "./_components/request-form";

export const metadata: Metadata = {
  title:
    "Immigration CRM Software for Canadian Firms | BBI-CRM by Big Bang Immigration",
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
  { label: "IELTS results", status: "Uploaded", color: "#3D6FD8", filled: false },
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
  { name: "Retainer", n: 2, cards: [{ name: "R. Gurung", type: "Study permit", pct: "10%", color: "#B9C9F5" }, { name: "S. Okafor", type: "Visitor", pct: "20%", color: "#B9C9F5" }] },
  { name: "Documents", n: 5, cards: [{ name: "P. Anand", type: "EE · CEC", pct: "75%", color: "#3D6FD8" }, { name: "B. Khatiwada", type: "Family", pct: "60%", color: "#3D6FD8" }] },
  { name: "Review", n: 1, cards: [{ name: "F. Al-Rashid", type: "Study permit", pct: "90%", color: "#3D6FD8" }] },
  { name: "Submitted", n: 3, cards: [{ name: "M. Santos", type: "WP · LMIA", pct: "100%", color: "#7FA4F0" }, { name: "C. Wei", type: "Spousal", pct: "100%", color: "#7FA4F0" }] },
  { name: "Decision", n: 9, cards: [{ name: "A. Mainali", type: "PNP · Approved", pct: "100%", color: "#1F7A3E" }, { name: "D. Khatiwada", type: "Business · Refused", pct: "100%", color: "#D32F2F" }] },
];

const PORTAL_DOCS = [
  { doc: "Passport (all pages)", date: "Sep 2", status: "Accepted", bg: "#DDF3E4", fg: "#1F7A3E" },
  { doc: "ECA report - WES", date: "Sep 4", status: "Accepted", bg: "#DDF3E4", fg: "#1F7A3E" },
  { doc: "IELTS test report", date: "Sep 8", status: "Under review", bg: "#E9F0FC", fg: "#3D6FD8" },
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

// Feature card shell: pastel gradient, embedded UI snippet, numbered title.
function FeatureCard({
  gradient,
  number,
  title,
  body,
  children,
}: {
  gradient: string;
  number: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[#D9E2EC]"
      style={{ background: gradient }}
    >
      <div className="flex min-h-[210px] flex-col gap-2 p-5.5">{children}</div>
      <div className="flex flex-col gap-1.5 px-5.5 pb-6 pt-1.5">
        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#3D6FD8]">
          {number}
        </div>
        <div className="text-base font-bold">{title}</div>
        <p className="text-[13.5px] leading-relaxed text-[#5A6A85]">{body}</p>
      </div>
    </div>
  );
}

// A lightweight CSS recreation of the real dashboard for the hero browser
// frame. Swap for a real screenshot at /public/dashboard-preview.png later
// if preferred; this stays crisp at every size with no binary asset.
function DashboardMock() {
  const kpis = [
    ["ACTIVE CASES", "10", "+1 from last month"],
    ["CLIENTS", "17", "-21 from last month"],
    ["RETAINED THIS MONTH", "3", "no change"],
    ["OUTSTANDING FEES", "$137", "collections current"],
  ];
  return (
    <div className="flex bg-white text-left">
      <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-[#D9E2EC] p-3 text-[10.5px] font-medium text-[#5A6A85] sm:flex">
        {["Dashboard", "Cases", "Clients", "Leads", "Tasks", "Forms", "Payments", "Appointments"].map((l, i) => (
          <span
            key={l}
            className={`rounded-md px-2.5 py-1.5 ${i === 0 ? "bg-[#E9F0FC] font-semibold text-[#3D6FD8]" : ""}`}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="text-sm font-extrabold tracking-[-.01em]">
          Welcome back, Saurav
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map(([k, v, s]) => (
            <div key={k} className="rounded-lg border border-[#D9E2EC] p-2.5">
              <div className="text-[8.5px] tracking-[.08em] text-[#5A6A85]">{k}</div>
              <div className="text-lg font-extrabold">{v}</div>
              <div className="text-[8.5px] text-[#5A6A85]">{s}</div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border-2 border-[#3D6FD8]/40">
          <div className="flex items-center justify-between bg-[#1B365D] px-3 py-1.5 text-[10px] font-semibold text-white">
            Upcoming appointments
            <span className="rounded-full bg-white/20 px-1.5 text-[9px]">1</span>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex w-9 flex-col items-center rounded-md bg-[#F4F6F9] py-1">
              <span className="text-[7px] font-bold text-[#3D6FD8]">SEP</span>
              <span className="text-sm font-extrabold leading-4">14</span>
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-semibold">10:30 a.m. · Priya Anand</div>
              <div className="text-[9px] text-[#5A6A85]">PR Consultation · Online</div>
            </div>
            <span className="ml-auto rounded-md border border-[#D9E2EC] px-2 py-1 text-[9px] font-semibold">
              View
            </span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PIPELINE.map((s) => (
            <div key={s.name} className="rounded-lg border border-[#D9E2EC] p-2">
              <div className="flex justify-between text-[8.5px] font-bold text-[#5A6A85]">
                <span>{s.name}</span>
                <span className="font-[family-name:var(--font-dm-mono)]">{s.n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CrmLandingPage() {
  return (
    <main
      className={`${jakarta.variable} ${dmMono.variable} marketing-radius flex min-h-dvh flex-col overflow-x-hidden bg-white font-[family-name:var(--font-jakarta)] text-[#1B365D] antialiased`}
    >
      <HeroBand>
        <MarketingNav
          center={
            <div className="hidden flex-wrap justify-center gap-5 text-[13px] font-medium text-[#5A6A85] md:flex">
              <a href="#features" className="hover:text-[#1B365D]">Features</a>
              <a href="#how" className="hover:text-[#1B365D]">How it works</a>
              <a href="#trust" className="hover:text-[#1B365D]">Security</a>
              <a href="#faq" className="hover:text-[#1B365D]">FAQ</a>
            </div>
          }
          actions={
            <>
              <Link
                href="/"
                className="hidden px-3.5 py-2 text-[13px] font-medium text-[#5A6A85] hover:text-[#1B365D] sm:block"
              >
                For applicants
              </Link>
              <a
                href="#request"
                className="rounded-lg bg-[#D32F2F] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1B365D]"
              >
                Request access
              </a>
            </>
          }
        />
        <header className="relative flex flex-col items-center gap-5 px-6 pt-16 text-center text-white sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/20 py-1 pl-1 pr-3 text-xs font-semibold">
            <span className="rounded-full bg-white px-1.5 py-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#3D6FD8]">
              ALPHA
            </span>
            Built inside a CICC-regulated firm · Toronto
          </span>
          <h1 className="max-w-[820px] text-balance text-[clamp(36px,5vw,60px)] font-extrabold leading-[1.05] tracking-[-.03em]">
            The all-in-one CRM for Canadian immigration practices
          </h1>
          <p className="max-w-[600px] text-[17px] leading-relaxed text-white/90">
            Case management, IRCC forms, submission packages, compliance and
            billing in one place — hosted in Canada, used daily by our own
            consultants.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <PrimaryLink href="#request" tone="red">
              Request alpha access <ArrowRight className="h-4 w-4" />
            </PrimaryLink>
            <WhiteLink href="#features">See what&apos;s inside</WhiteLink>
          </div>
          <div className="text-[12.5px] text-white/85">
            Free through alpha &amp; beta · One week of hands-on training ·
            Canadian data residency
          </div>
          <div className="relative z-[1] mt-8 w-full max-w-[1120px] pb-0 text-[#1B365D]">
            <BrowserFrame url="app.bigbangimmigration.com/dashboard">
              <DashboardMock />
            </BrowserFrame>
          </div>
        </header>
      </HeroBand>

      {/* Programs strip */}
      <section className="flex flex-col items-center gap-5 px-6 pt-14">
        <div className="text-[13px] text-[#5A6A85]">
          Purpose-built for every stream our practice files
        </div>
        <div className="flex max-w-[900px] flex-wrap justify-center gap-2.5">
          {PROGRAMS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-[#D9E2EC] bg-white px-3.5 py-2 text-[13px] font-semibold"
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
            gradient="linear-gradient(180deg,#F1F5FD 0%,#FFFFFF 100%)"
            number="01"
            title="Track every document"
            body="Checklists per application type drive collection, status and assembly order."
          >
            <div className="flex justify-between text-xs font-bold">
              <span>Checklist · Express Entry CEC</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] font-medium text-[#5A6A85]">
                18/24
              </span>
            </div>
            {CHECKLIST.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-xs"
              >
                <span
                  className="h-3 w-3 border"
                  style={{
                    borderColor: "#3D6FD8",
                    background: c.filled ? "#3D6FD8" : "#fff",
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
            gradient="linear-gradient(180deg,#F6F1FC 0%,#FFFFFF 100%)"
            number="02"
            title="Never miss an expiry"
            body="Permits, biometrics, medicals and LMIA dates tracked with reminders."
          >
            <div className="text-xs font-bold">Expiring in 30 days</div>
            {DEADLINES.map((d) => (
              <div
                key={d.client}
                className="flex items-center gap-2.5 rounded-lg border border-[#D9E2EC] bg-white px-2.5 py-1.5 text-xs"
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
            gradient="linear-gradient(180deg,#EEF6FB 0%,#FFFFFF 100%)"
            number="03"
            title="Forms fill themselves"
            body="IMM forms and portals populated from a single client profile."
          >
            <div className="text-xs font-bold">IMM 0008 · Autofill</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {AUTOFILL.map(([k, v, mono]) => (
                <div
                  key={k}
                  className="rounded-lg border border-[#D9E2EC] bg-white px-2 py-1.5"
                >
                  <div className="text-[9.5px] text-[#5A6A85]">{k}</div>
                  <div
                    className={`font-semibold ${mono ? "font-[family-name:var(--font-dm-mono)]" : ""}`}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-[11.5px] font-semibold text-[#3D6FD8]">
              <Check className="h-3 w-3" strokeWidth={2.5} />
              92 fields filled from client profile
            </div>
          </FeatureCard>

          <FeatureCard
            gradient="linear-gradient(180deg,#FBF3EE 0%,#FFFFFF 100%)"
            number="04"
            title="Assemble to portal limits"
            body="Merge, compress and bookmark in one click; output to OneDrive with versioning."
          >
            <div className="text-xs font-bold">Submission package</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#3D6FD8] px-2 py-0.5 text-[10.5px] text-white">
                IRCC 4 MB
              </span>
              <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-0.5 text-[10.5px]">
                OINP 10 MB
              </span>
              <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-0.5 text-[10.5px]">
                Email 20 MB
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[11.5px]">
              {PACKAGE_FILES.map(([name, size]) => (
                <div
                  key={name}
                  className="flex justify-between rounded-lg border border-[#D9E2EC] bg-white px-2 py-1.5"
                >
                  <span>{name}</span>
                  <span className="text-[#5A6A85]">{size}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 text-[11px]">
              <div className="h-1.5 flex-1 bg-[#E3EAF3]">
                <div className="h-full w-[93%] bg-[#3D6FD8]" />
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
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[#D9E2EC] bg-white lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-3.5 p-8 sm:p-11">
              <span className="self-start rounded-full bg-[#E9F0FC] px-2.5 py-1 text-[11px] font-semibold text-[#3D6FD8]">
                Cases
              </span>
              <div className="text-2xl font-extrabold leading-tight tracking-[-.02em]">
                Pipeline board from retainer to decision
              </div>
              <p className="text-[14.5px] leading-relaxed text-[#5A6A85]">
                Every active case by phase, with who owns it and what&apos;s
                blocking it. Click a card to open the file.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3D6FD8] hover:text-[#1B365D]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
            <div
              className="grid min-h-[300px] grid-cols-5 content-start gap-2 border-t border-[#D9E2EC] p-7 lg:border-l lg:border-t-0"
              style={{ background: "linear-gradient(135deg,#EEF3FC,#F7F4FC)" }}
            >
              {PIPELINE.map((s) => (
                <div key={s.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between px-0.5 text-[10px] font-bold text-[#5A6A85]">
                    <span className="truncate">{s.name}</span>
                    <span className="font-[family-name:var(--font-dm-mono)]">{s.n}</span>
                  </div>
                  {s.cards.map((k) => (
                    <div
                      key={k.name}
                      className="flex flex-col gap-1 rounded-lg border border-[#D9E2EC] bg-white p-2"
                    >
                      <div className="text-[10.5px] font-semibold leading-tight">
                        {k.name}
                      </div>
                      <div className="text-[9px] text-[#5A6A85]">{k.type}</div>
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
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[#D9E2EC] bg-white lg:grid-cols-2">
            <div
              className="order-2 flex min-h-[300px] flex-col gap-2 border-t border-[#D9E2EC] p-7 lg:order-1 lg:border-r lg:border-t-0"
              style={{ background: "linear-gradient(135deg,#F7F4FC,#EEF3FC)" }}
            >
              <div className="flex justify-between text-xs font-bold">
                <span>Client portal · Priya Anand</span>
                <span className="rounded-full bg-[#E9F0FC] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#3D6FD8]">
                  Signed in
                </span>
              </div>
              {PORTAL_DOCS.map((p) => (
                <div
                  key={p.doc}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-xs"
                >
                  <span>{p.doc}</span>
                  <span className="text-[10.5px] text-[#5A6A85]">{p.date}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
              <div className="mt-auto rounded-[10px] border border-dashed border-[#3D6FD8] bg-white p-3 text-center text-[11.5px] text-[#5A6A85]">
                Drop files here or <strong className="text-[#3D6FD8]">browse</strong>
              </div>
            </div>
            <div className="order-1 flex flex-col justify-center gap-3.5 p-8 sm:p-11 lg:order-2">
              <span className="self-start rounded-full bg-[#E9F0FC] px-2.5 py-1 text-[11px] font-semibold text-[#3D6FD8]">
                Client portal
              </span>
              <div className="text-2xl font-extrabold leading-tight tracking-[-.02em]">
                Clients upload, sign and track from one link
              </div>
              <p className="text-[14.5px] leading-relaxed text-[#5A6A85]">
                Per-document status, intake questionnaires with conditional
                logic and e-signed retainers — no more email chains.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3D6FD8] hover:text-[#1B365D]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
          </div>

          {/* Compliance */}
          <div className="grid items-stretch overflow-hidden rounded-2xl border border-[#D9E2EC] bg-white lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-3.5 p-8 sm:p-11">
              <span className="self-start rounded-full bg-[#E9F0FC] px-2.5 py-1 text-[11px] font-semibold text-[#3D6FD8]">
                Compliance
              </span>
              <div className="text-2xl font-extrabold leading-tight tracking-[-.02em]">
                Audit-ready by default, not the week before review
              </div>
              <p className="text-[14.5px] leading-relaxed text-[#5A6A85]">
                Retainers tied to the CICC Code, supervision hierarchies, trust
                records and a full access log — exportable in one click.
              </p>
              <a
                href="#request"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3D6FD8] hover:text-[#1B365D]"
              >
                Read more <span aria-hidden>&rarr;</span>
              </a>
            </div>
            <div
              className="flex min-h-[300px] flex-col gap-2.5 border-t border-[#D9E2EC] p-7 lg:border-l lg:border-t-0"
              style={{ background: "linear-gradient(135deg,#EEF3FC,#FBF3EE)" }}
            >
              <div className="text-xs font-bold">Practice record · Q3 2026</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["RETAINERS", "142", "100% signed", "#1F7A3E"],
                  ["TRUST BALANCE", "$48.2k", "reconciled Sep 9", "#5A6A85"],
                  ["CONFLICTS", "0", "checked at intake", "#5A6A85"],
                ].map(([k, v, s, c]) => (
                  <div key={k} className="rounded-lg border border-[#D9E2EC] bg-white p-3">
                    <div className="text-[9.5px] tracking-[.08em] text-[#5A6A85]">{k}</div>
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
                  className="grid grid-cols-[auto_1fr_auto] gap-2.5 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-[11.5px]"
                >
                  <span className="font-[family-name:var(--font-dm-mono)] text-[#5A6A85]">
                    {a.t}
                  </span>
                  <span>{a.what}</span>
                  <span className="text-[#5A6A85]">{a.who}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="trust" className="flex flex-col items-center gap-4 px-6 pt-28">
        <SectionHead
          eyebrow="ACHIEVE MORE WITH LESS EFFORT"
          title="Secure, compliant, and yours to keep."
          subline="Hosted in Canada, built to the CICC Code."
        />
        <div className="mt-10 grid w-full max-w-[1120px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-[#D9E2EC] bg-white p-7 text-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9F0FC] text-[#3D6FD8]">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="text-base font-bold">{title}</div>
              <p className="text-[13.5px] leading-relaxed text-[#5A6A85]">{body}</p>
            </div>
          ))}
        </div>
      </section>

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
            <h2 className="text-balance text-[clamp(30px,3.6vw,46px)] font-extrabold leading-[1.08] tracking-[-.03em]">
              A smarter way to run your practice
            </h2>
            <p className="max-w-[440px] text-[15px] leading-relaxed text-white/90">
              We onboard a small number of firms at a time and reach out to
              schedule your training week.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <PrimaryLink href="#request" tone="red">
                Request alpha access <ArrowRight className="h-4 w-4" />
              </PrimaryLink>
              <WhiteLink href="mailto:info@bigbangimmigration.com">
                Talk to us
              </WhiteLink>
            </div>
          </div>
          <div className="relative flex flex-col gap-3 rounded-2xl border border-white/80 bg-white p-5 text-[#1B365D] shadow-[0_30px_60px_-30px_rgba(27,54,93,.5)]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold">Upcoming appointments</div>
              <span className="rounded-full bg-[#E9F0FC] px-2 py-0.5 text-[10.5px] font-semibold text-[#3D6FD8]">
                3
              </span>
            </div>
            {APPTS.map((a) => (
              <div
                key={a.day}
                className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[10px] border border-[#D9E2EC] px-3 py-2.5"
              >
                <div className="bg-[#F4F6F9] py-1.5 text-center">
                  <div className="text-[9px] font-bold text-[#3D6FD8]">{a.mon}</div>
                  <div className="text-base font-extrabold leading-none">{a.day}</div>
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold">
                    {a.time} · {a.name}
                  </div>
                  <div className="text-[11px] text-[#5A6A85]">{a.type}</div>
                </div>
                <span className="rounded-md border border-[#D9E2EC] px-2.5 py-1 text-[11px] font-semibold">
                  View
                </span>
              </div>
            ))}
          </div>
        </GradientBlock>
      </section>

      {/* Request access form */}
      <section id="request" className="mx-auto w-full max-w-3xl px-6 pt-28">
        <div className="flex flex-col items-center gap-4 text-center">
          <Eyebrow>REQUEST ACCESS</Eyebrow>
          <h2 className="text-balance text-[clamp(28px,3.5vw,42px)] font-extrabold leading-[1.1] tracking-[-.03em]">
            Request alpha access
          </h2>
          <p className="max-w-xl text-base text-[#5A6A85]">
            Tell us about your firm. We onboard a small number of firms at a
            time and will reach out to schedule your training week.
          </p>
        </div>
        <div className="mt-8">
          <RequestForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-6 pb-8 pt-24">
        <div className="mx-auto grid max-w-[1120px] gap-10 border-b border-[#D9E2EC] pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3.5">
            <Image
              src="/logo.png"
              alt="Big Bang Immigration Consulting Inc"
              width={220}
              unoptimized
              height={70}
              className="h-9 w-auto self-start"
            />
            <p className="max-w-[320px] text-[13px] leading-relaxed text-[#5A6A85]">
              Immigration CRM built inside a CICC-regulated firm. 211-2390
              Eglinton Avenue East, Toronto, ON M1K 2P5 · +1 (416) 386-5351 ·
              info@bigbangimmigration.com
            </p>
          </div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="font-bold">Product</div>
            <a href="#features" className="text-[#5A6A85] hover:text-[#1B365D]">Features</a>
            <a href="#how" className="text-[#5A6A85] hover:text-[#1B365D]">How it works</a>
            <a href="#trust" className="text-[#5A6A85] hover:text-[#1B365D]">Security</a>
          </div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="font-bold">Firm</div>
            <a href="https://bigbangimmigration.com" className="text-[#5A6A85] hover:text-[#1B365D]">bigbangimmigration.com</a>
            <Link href="/book-an-appointment" className="text-[#5A6A85] hover:text-[#1B365D]">Book appointment</Link>
            <Link href="/login" className="text-[#5A6A85] hover:text-[#1B365D]">Staff login</Link>
          </div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="font-bold">Legal</div>
            <Link href="/privacy-policy" className="text-[#5A6A85] hover:text-[#1B365D]">Privacy Policy</Link>
            <Link href="/data-usage" className="text-[#5A6A85] hover:text-[#1B365D]">Data Usage</Link>
            <Link href="/terms" className="text-[#5A6A85] hover:text-[#1B365D]">Terms of Use</Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 pt-5 text-xs text-[#5A6A85]">
          <span>© 2026 Big Bang Immigration Consulting Inc.</span>
          <span>
            Licensed by the College of Immigration and Citizenship Consultants
            (CICC) · RCIC# R711181
          </span>
        </div>
      </footer>
    </main>
  );
}
