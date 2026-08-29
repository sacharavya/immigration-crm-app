import Link from "next/link";

import { PublicFooter } from "@/components/public-footer";

// Shared shell for the public legal pages: consistent width, typography,
// updated date, and cross-links between the three documents.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/"
          className="text-sm text-stone-500 hover:text-[var(--navy)] hover:underline"
        >
          &larr; Big Bang Immigration
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-stone-500">Last updated: {updated}</p>
        <div className="prose-legal mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
          {children}
        </div>
        <div className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-500">
          Related:{" "}
          <Link href="/privacy-policy" className="text-[var(--navy)] hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/data-usage" className="text-[var(--navy)] hover:underline">
            Data Usage Summary
          </Link>
          {" · "}
          <Link href="/terms" className="text-[var(--navy)] hover:underline">
            Terms of Use
          </Link>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900">{heading}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
