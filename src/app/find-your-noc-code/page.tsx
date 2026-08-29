import type { Metadata } from "next";

import { NocFinder } from "./_components/noc-finder";

export const metadata: Metadata = {
  title: "Find your NOC Code — Big Bang Immigration",
  description:
    "New IRCC rules limit spousal open work permits (SOWP) by occupation. Find your NOC 2021 code and check instantly whether your job qualifies for SOWP or Express Entry.",
};

export default function FindYourNocCodePage() {
  return <NocFinder />;
}
