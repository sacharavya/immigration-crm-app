import { CaseBindLogo } from "@/components/brand/casebind-logo";

// Static landing card shown when:
// - the token doesn't exist (typo, fake URL)
// - it was rotated by staff
// - the case has moved past documentation_review (submitted_to_ircc or
//   beyond) or has been closed
//
// Intentionally vague: we don't reveal which of those is true to a random
// visitor. Just points them at the firm's contact.

export function ExpiredCard() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--surface-sunken)] px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <CaseBindLogo className="h-16 w-auto text-[#1E2136]" />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold text-[var(--navy)]">
          This upload link is no longer active.
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Either the link has been rotated, the case has moved past the document
          review stage, or the case has been closed.
        </p>
        <p className="mt-6 text-center text-sm text-foreground">
          Please contact our office for help:
        </p>
        <p className="mt-1 text-center text-sm font-medium text-foreground">
          info@genzdatalabs.com{" "}
          <span className="text-[var(--subtle-foreground)]">·</span>{" "}
          +1 416-386-5351
        </p>
      </div>
    </main>
  );
}
