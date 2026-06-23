import { ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";

export default function CrsCalculatorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <Calculator className="h-12 w-12 text-[var(--gold)]" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
        CRS Calculator
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
        Our Comprehensive Ranking System calculator is coming soon. Check back
        shortly to estimate your Express Entry score.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--navy)] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </main>
  );
}
