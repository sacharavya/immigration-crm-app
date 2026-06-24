import {
  ArrowRight,
  Calculator,
  CalendarCheck,
  Compass,
  LogIn,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={1933}
            height={537}
            priority
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-4">
            <Link
              href="/book-an-appointment"
              className="hidden text-sm text-stone-600 hover:text-stone-900 sm:block"
            >
              Book appointment
            </Link>
            <Link
              href="/login"
              className="border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Staff login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-16 text-center">
          <Image
            src="/RCIC.png"
            alt="RCIC — Regulated Canadian Immigration Consultant"
            width={400}
            height={400}
            className="h-auto w-48 object-contain"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Your pathway to Canada
            <br />
            <span className="text-[var(--navy)]">starts here.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
            Big Bang Immigration Consulting is a regulated Canadian immigration
            firm helping individuals and families navigate every step of the
            immigration process — with clarity, honesty, and care.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/book-an-appointment"
              className="inline-flex items-center gap-2 bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--navy-light)]"
            >
              Book a consultation <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/find-a-pathway"
              className="inline-flex items-center gap-2 border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Find your pathway
            </Link>
          </div>
          <p className="mt-6 text-xs text-stone-400">
            Licensed by the College of Immigration and Citizenship Consultants
            (CICC) &middot; RCIC# R711181
          </p>
        </div>
      </section>

      {/* ── Quick links ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl flex-1 px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <LinkCard
            href="/book-an-appointment"
            icon={<CalendarCheck className="h-6 w-6 text-[var(--gold)]" />}
            title="Book an Appointment"
            description="Schedule an initial consultation or case review meeting with our team."
          />
          <LinkCard
            href="/login"
            icon={<LogIn className="h-6 w-6 text-[var(--gold)]" />}
            title="Staff Login"
            description="Access the staff console to manage cases, clients, and documents."
          />
          <LinkCard
            href="/crs-calculator"
            icon={<Calculator className="h-6 w-6 text-[var(--gold)]" />}
            title="CRS Calculator"
            description="Estimate your Comprehensive Ranking System score for Express Entry."
          />
          <LinkCard
            href="/find-a-pathway"
            icon={<Compass className="h-6 w-6 text-[var(--gold)]" />}
            title="Find a Pathway"
            description="Discover which immigration program best matches your profile and goals."
          />
          <LinkCard
            href="/find-your-noc-code"
            icon={<Search className="h-6 w-6 text-[var(--gold)]" />}
            title="Find your NOC Code"
            description="Look up the National Occupation Classification code for your job title."
          />
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-stone-200 bg-white p-6 transition-colors hover:border-[var(--navy)]/30"
    >
      <div className="flex items-center justify-between">
        {icon}
        <ArrowRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--navy)]" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
        {description}
      </p>
    </Link>
  );
}
