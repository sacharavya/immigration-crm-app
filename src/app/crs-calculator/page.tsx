import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/shell";

import { CrsForm } from "./_components/crs-form";

export const metadata: Metadata = {
  title: "CRS Score Calculator — genzdatalabs Immigration",
  description:
    "Estimate your Comprehensive Ranking System (CRS) score for Express Entry immigration to Canada.",
};

export default function CrsCalculatorPage() {
  return (
    <MarketingShell
      crumbs={[{ label: "CRS Calculator" }]}
      title="CRS Calculator"
      subtitle="Estimate your Comprehensive Ranking System score for Express Entry."
    >
      <CrsForm />
    </MarketingShell>
  );
}
