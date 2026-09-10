import {
  Bot,
  Briefcase,
  Building2,
  FileStack,
  FileText,
  LineChart,
  Lock,
  Plug,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";

import { RequestForm } from "./_components/request-form";

export const metadata: Metadata = {
  title:
    "Immigration CRM Software for Canadian Firms | BBI-CRM by Big Bang Immigration",
  description:
    "Immigration case management software built inside a CICC-regulated firm: submission package builder, IRCC form autofill, client portal, compliance, billing, and Canadian data residency. Free through alpha and beta testing, with a week of hands-on training.",
};

// dev: true = not shipped yet; rendered with an "In development" tag so alpha
// firms know exactly what exists today vs what lands during the program.
type FeatureItem = { text: string; dev?: boolean };

const FEATURES: Array<{
  Icon: typeof Briefcase;
  title: string;
  dev?: boolean; // whole group still in development
  items: FeatureItem[];
}> = [
  {
    Icon: Briefcase,
    title: "Case Management",
    items: [
      { text: "Case creation by application type (Express Entry, PNP, work permit, study permit, family sponsorship, and more)" },
      { text: "Checklist per application type, driving document collection and assembly order" },
      { text: "Case status milestones and pipeline view" },
      { text: "Deadlines, reminders and expiry tracking (permits, biometrics, medicals, LMIA)" },
      { text: "Task assignment and internal notes" },
      { text: "Contact and client records: applicant, dependants, employer, representative" },
    ],
  },
  {
    Icon: FileStack,
    title: "Submission Package Builder",
    items: [
      { text: "Merge documents in checklist order" },
      { text: "Compress to portal presets: IRCC 4 MB, IRCC 2 MB, OINP 10 MB, email 20 MB, or merge only" },
      { text: "Auto bookmarks and index page" },
      { text: "Page-level editing: reorder, rotate, delete" },
      { text: "Redaction and bursting (split a package back into individual files)", dev: true },
      { text: "Output to the case's Final folder in OneDrive, with readable file naming and version tracking" },
    ],
  },
  {
    Icon: FileText,
    title: "Forms and Autofill",
    dev: true,
    items: [
      { text: "IRCC form library (IMM forms) with data mapping" },
      { text: "Autofill from case data into IRCC PDFs and web portals" },
      { text: "Provincial nominee portal autofill" },
      { text: "Form validation before submission" },
      { text: "Reusable client profile: data entered once flows into every form" },
    ],
  },
  {
    Icon: Bot,
    title: "AI Layer",
    dev: true,
    items: [
      { text: "Case file strength assessment per application type" },
      { text: "Completeness check against the checklist" },
      { text: "Consistency check across documents and forms" },
      { text: "Substantive review against published IRCC policies and program requirements" },
      { text: "AI drafting: cover letters, submission letters, LMIA rationales, procedural fairness responses" },
      { text: "Regulatory monitor for IRCC and provincial program changes" },
      { text: "Inference only — no training on client data" },
    ],
  },
  {
    Icon: Users,
    title: "Client Portal",
    items: [
      { text: "Document upload with per-document status (requested, uploaded, accepted, rejected)" },
      { text: "Intake questionnaires with conditional logic" },
      { text: "E-signatures on retainers and consultation agreements" },
      { text: "Case status visibility for the client", dev: true },
      { text: "Multilingual intake", dev: true },
      { text: "Secure messaging", dev: true },
    ],
  },
  {
    Icon: ShieldCheck,
    title: "CICC Compliance and Practice Governance",
    items: [
      { text: "Retainer agreement generation tied to the CICC Code" },
      { text: "Supervision hierarchies mapped to CICC accountability" },
      { text: "Client file retention rules and audit logs" },
      { text: "Conflict of interest check at intake", dev: true },
      { text: "Complaint and incident documentation", dev: true },
      { text: "Trust and client account records", dev: true },
      { text: "Audit-ready practice record export", dev: true },
    ],
  },
  {
    Icon: Receipt,
    title: "Billing and Payments",
    items: [
      { text: "Invoicing and payment tracking" },
      { text: "Retainer balance tracking" },
      { text: "Trust vs general account separation", dev: true },
      { text: "Online payments (Stripe)", dev: true },
    ],
  },
  {
    Icon: Plug,
    title: "Integrations",
    items: [
      { text: "OneDrive document storage" },
      { text: "Outlook and Microsoft 365 calendar sync" },
      { text: "Google Drive and Gmail", dev: true },
      { text: "Stripe", dev: true },
      { text: "Public API and webhooks", dev: true },
      { text: "Data import from Officio and other incumbents", dev: true },
    ],
  },
  {
    Icon: Building2,
    title: "Enterprise and Multi-Office",
    dev: true,
    items: [
      { text: "Multi-tenant firm accounts" },
      { text: "Role-based permissions" },
      { text: "SSO" },
      { text: "Multi-office structures and reporting" },
      { text: "White-label option" },
    ],
  },
  {
    Icon: Lock,
    title: "Security and Data Residency",
    items: [
      { text: "Canadian hosting: data stored and processed inside Canada" },
      { text: "Client-side PDF processing — documents never leave the browser during assembly" },
      { text: "Row-level security per firm and per case" },
      { text: "Encryption and access logs" },
    ],
  },
  {
    Icon: LineChart,
    title: "Reporting and Analytics",
    items: [
      { text: "Caseload and pipeline dashboards" },
      { text: "Staff productivity and turnaround times" },
      { text: "Revenue and outstanding balances" },
      { text: "Application outcome tracking by program", dev: true },
    ],
  },
];

function DevTag() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
      In development
    </span>
  );
}

export default function CrmPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Big Bang Immigration"
              width={160}
              height={80}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <a
            href="#request-access"
            className="bg-[var(--navy)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--navy)]/90"
          >
            Request alpha access
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold,#b8860b)]">
            BBI-CRM · Alpha program
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Immigration CRM software built inside a{" "}
            <span className="text-[var(--navy)]">CICC-regulated firm</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            We built BBI-CRM to run our own practice: case management,
            submission packages, IRCC forms, compliance, and billing in one
            place, hosted in Canada. Now we are opening it to a small group of
            firms — free through alpha and beta testing, with a full week of
            hands-on training, in exchange for the feedback that shapes what
            we build next.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#request-access"
              className="inline-flex items-center gap-2 bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)]/90"
            >
              Request alpha access
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 hover:border-stone-400"
            >
              See what is inside
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-stone-500">
            <span>Free through alpha and beta</span>
            <span>One week of hands-on training</span>
            <span>Canadian data residency</span>
            <span>Built and used daily by an active RCIC practice</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Everything a firm runs on, in one system
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-500">
          The platform is in daily use inside our own practice. Anything
          tagged{" "}
          <span className="font-medium text-amber-700">In development</span>{" "}
          lands during the alpha — and alpha firms decide which of it comes
          first.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, dev, items }) => (
            <div
              key={title}
              className="rounded-lg border border-stone-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--navy)]/5 text-[var(--navy)]">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-base font-semibold text-stone-900">
                  {title}
                </h3>
                {dev && <DevTag />}
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-stone-600">
                {items.map((item) => (
                  <li key={item.text} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                    <span>
                      {item.text}
                      {item.dev && !dev && (
                        <>
                          {" "}
                          <DevTag />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Alpha program terms */}
      <section className="border-y border-stone-200 bg-stone-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              What alpha firms get
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-stone-600">
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                Full platform access at no cost through alpha and beta testing
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                One week of hands-on training for your team, run by the people
                who use the platform daily
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                A direct line to the builders: your feedback becomes amendments
                to the software, often within days
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                Priority say in the roadmap while the platform takes shape
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                No obligation when testing ends: if the platform has earned a
                place in your firm, migrate onto a subscription or package and
                keep everything you have built — your cases, documents, and
                setup carry over. Pricing is not set yet, and testing firms
                will hear it first and help shape it.
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                Prefer not to continue? Download your complete data and close
                the account — we permanently delete what remains and store
                nothing further.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              What we ask in return
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-stone-600">
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                Use it on real work and tell us honestly where it falls short
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                A short feedback session with your team every few weeks
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]" />
                Patience with rough edges — it is an alpha, and rough edges you
                report are the ones that get fixed
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="request-access" className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Request alpha access
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Tell us about your firm. We onboard a small number of firms at a
          time and will reach out to schedule your training week.
        </p>
        <div className="mt-8">
          <RequestForm />
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
