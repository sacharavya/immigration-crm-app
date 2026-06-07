import { CheckCircle2 } from "lucide-react";

export function SubmittedCard() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold text-stone-900">
        Thank you — your intake form is submitted.
      </h1>
      <p className="mt-3 text-sm text-stone-600">
        Our team will review your answers and reach out if anything needs
        clarification. You don&rsquo;t need to do anything else right now.
      </p>
      <p className="mt-6 text-xs text-stone-500">
        If you spot a mistake, reply to the email this link came from and we
        can reopen the form for you.
      </p>
    </div>
  );
}
