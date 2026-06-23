import type { Metadata } from "next";

import { CrsForm } from "./_components/crs-form";

export const metadata: Metadata = {
  title: "CRS Score Calculator — Big Bang Immigration",
  description:
    "Estimate your Comprehensive Ranking System (CRS) score for Express Entry immigration to Canada.",
};

export default function CrsCalculatorPage() {
  return <CrsForm />;
}
