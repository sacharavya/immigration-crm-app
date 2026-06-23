import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

export default function FindAPathwayPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <Compass className="h-12 w-12 text-[var(--gold)]" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
        Find a Pathway
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
        Our immigration pathway finder is coming soon. Answer a few questions
        and we&apos;ll recommend the programs that best fit your situation.
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
