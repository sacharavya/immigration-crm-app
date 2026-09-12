import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: "Find a Pathway — Big Bang Immigration",
  description:
    "Discover which Canadian immigration program best matches your profile and goals.",
};

export default function FindAPathwayPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Find a Pathway" }]}
      title="Find a Pathway"
      subtitle="Discover which immigration program best matches your profile and goals."
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#D9E2EC] bg-white px-6 py-20 text-center shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E9F0FC] text-[#3D6FD8]">
          <Compass className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-extrabold tracking-[-.02em]">
          The pathway finder is almost ready
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-[#5A6A85]">
          We are building a guided questionnaire that matches your profile to
          the right program. Until then, the fastest way to find your pathway
          is a conversation with a licensed consultant.
        </p>
        <Link
          href="/book-an-appointment"
          className="mt-2 rounded-[10px] bg-[#3D6FD8] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#2F5BC0]"
        >
          Book a consultation
        </Link>
      </div>
      <div className="pb-24" />
    </MarketingShell>
  );
}
