import Link from "next/link";

import { MarketingShell } from "@/components/marketing/shell";

// Shared shell for the public legal pages, rendered inside the marketing
// chrome: gradient breadcrumb band, shared footer, cross-links between the
// three documents.
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
    <MarketingShell
      crumbs={[{ label: "Legal", href: "/privacy-policy" }, { label: title }]}
      title={title}
      subtitle={`Last updated: ${updated}`}
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:p-10">
        <div className="prose-legal space-y-6 text-[15px] leading-relaxed text-stone-700">
          {children}
        </div>
        <div className="mt-12 border-t border-[#D9E2EC] pt-6 text-sm text-[#5A6A85]">
          Related:{" "}
          <Link href="/privacy-policy" className="text-[#1E2136] hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/data-usage" className="text-[#1E2136] hover:underline">
            Data Usage Summary
          </Link>
          {" · "}
          <Link href="/terms" className="text-[#1E2136] hover:underline">
            Terms of Use
          </Link>
        </div>
      </div>
      <div className="pb-24" />
    </MarketingShell>
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
