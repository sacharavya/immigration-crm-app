import type { Metadata } from "next";

import { NocFinder } from "./_components/noc-finder";

export const metadata: Metadata = {
  title: "Find your NOC Code — Big Bang Immigration",
  description:
    "Search the NOC 2021 classification to find the occupation code that matches your work experience for Canadian immigration.",
};

export default function FindYourNocCodePage() {
  return <NocFinder />;
}
