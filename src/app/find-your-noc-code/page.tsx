import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing/shell";

import { NocFinder } from "./_components/noc-finder";

export const metadata: Metadata = {
  title: "Find your NOC Code — genzdatalabs Immigration",
  description:
    "New IRCC rules limit spousal open work permits (SOWP) by occupation. Find your NOC 2021 code and check instantly whether your job qualifies for SOWP or Express Entry.",
};

export default function FindYourNocCodePage() {
  return (
    <MarketingShell
      crumbs={[{ label: "Find your NOC Code" }]}
      title="Find your NOC Code"
      subtitle="IRCC&apos;s new rules limit spousal open work permits (SOWP) to specific occupations. Find your NOC code and see instantly whether your job still qualifies for SOWP, and whether it is eligible for Express Entry."
    >
      <NocFinder />
      <div className="pb-24" />
    </MarketingShell>
  );
}
