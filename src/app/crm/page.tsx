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
  title: "BBI-CRM — Practice management for Canadian immigration firms",
  description:
    "Case management, submission package builder, IRCC form autofill, CICC compliance, and Canadian data residency. Join the free alpha program with a week of hands-on training.",
};

const FEATURES: Array<{
  Icon: typeof Briefcase;
  title: string;
  items: string[];
}> = [
  {
    Icon: Briefcase,
    title: "Case Management",
    items: [
      "Case creation by application type (Express Entry, PNP, work permit, study permit, family sponsorship, and more)",
      "Checklist per application type, driving document collection and assembly order",
      "Case status milestones and pipeline view",
      "Deadlines, reminders and expiry tracking (permits, biometrics, medicals, LMIA)",
      "Task assignment and internal notes",
      "Contact and client records: applicant, dependants, employer, representative",
    ],
  },
  {
    Icon: FileStack,
    title: "Submission Package Builder",
    items: [
      "Merge documents in checklist order",
      "Compress to portal presets: IRCC 4 MB, IRCC 2 MB, OINP 10 MB, email 20 MB, or merge only",
      "Auto bookmarks and index page",
      "Page-level editing: reorder, rotate, delete",
      "Redaction and bursting (split a package back into individual files)",
      "Output to the case's Final folder in OneDrive, with readable file naming and version tracking",
    ],
  },
  {
    Icon: FileText,
    title: "Forms and Autofill",
    items: [
      "IRCC form library (IMM forms) with data mapping",
      "Autofill from case data into IRCC PDFs and web portals",
      "Provincial nominee portal autofill",
      "Form validation before submission",
      "Reusable client profile: data entered once flows into every form",
    ],
  },
  {
    Icon: Bot,
    title: "AI Layer",
    items: [
      "Case file strength assessment per application type",
      "Completeness check against the checklist",
      "Consistency check across documents and forms",
      "Substantive review against published IRCC policies and program requirements",
      "AI drafting: cover letters, submission letters, LMIA rationales, procedural fairness responses",
      "Regulatory monitor for IRCC and provincial program changes",
      "Inference only — no training on client data",
    ],
  },
  {
    Icon: Users,
    title: "Client Portal",
    items: [
      "Document upload with per-document status (requested, uploaded, accepted, rejected)",
      "Intake questionnaires with conditional logic",
      "Case status visibility for the client",
      "Multilingual intake",
      "Secure messaging",
      "E-signatures",
    ],
  },
  {
    Icon: ShieldCheck,
    title: "CICC Compliance and Practice Governance",
    items: [
      "Retainer agreement generation tied to the CICC Code",
      "Conflict of interest check at intake",
      "Supervision hierarchies mapped to CICC accountability",
      "Client file retention rules and audit logs",
      "Complaint and incident documentation",
      "Trust and client account records",
      "Audit-ready practice record export",
    ],
  },
  {
    Icon: Receipt,
    title: "Billing and Payments",
    items: [
      "Invoicing and payment tracking",
      "Trust vs general account separation",
      "Online payments (Stripe)",
      "Retainer balance tracking",
    ],
  },
  {
    Icon: Plug,
    title: "Integrations",
    items: [
      "OneDrive and Google Drive document storage",
      "Gmail and Outlook",
      "Calendar sync",
      "Stripe",
      "Public API and webhooks",
      "Data import from Officio and other incumbents",
    ],
  },
  {
    Icon: Building2,
    title: "Enterprise and Multi-Office",
    items: [
      "Multi-tenant firm accounts",
      "Role-based permissions",
      "SSO",
      "Multi-office structures and reporting",
      "White-label option",
    ],
  },
  {
    Icon: Lock,
    title: "Security and Data Residency",
    items: [
      "Canadian hosting: data stored and processed inside Canada",
      "Client-side PDF processing — documents never leave the browser during assembly",
      "Row-level security per firm and per case",
      "Encryption and access logs",
    ],
  },
  {
    Icon: LineChart,
    title: "Reporting and Analytics",
    items: [
      "Caseload and pipeline dashboards",
      "Staff productivity and turnaround times",
      "Revenue and outstanding balances",
      "Application outcome tracking by program",
    ],
  },
];

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
            The immigration practice platform built inside a{" "}
            <span className="text-[var(--navy)]">CICC-regulated firm</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            We built BBI-CRM to run our own practice: case management,
            submission packages, IRCC forms, compliance, and billing in one
            place, hosted in Canada. Now we are opening it to a small group of
            firms — free during the alpha, with a full week of hands-on
            training, in exchange for the feedback that shapes what we build
            next.
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
            <span>Free during alpha</span>
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
          The platform is in daily use inside our own practice and under
          active development; some capabilities below land during the alpha —
          alpha firms decide which come first.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, items }) => (
            <div
              key={title}
              className="rounded-lg border border-stone-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--navy)]/5 text-[var(--navy)]">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-base font-semibold text-stone-900">
                  {title}
                </h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-stone-600">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                    {item}
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
                Full platform access at no cost for the length of the alpha
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
                Priority say in the roadmap and early-adopter pricing when the
                alpha ends
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
