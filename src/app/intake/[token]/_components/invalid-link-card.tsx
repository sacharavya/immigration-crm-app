import { AlertCircle } from "lucide-react";

export function InvalidLinkCard() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold text-stone-900">
        This link isn&rsquo;t active.
      </h1>
      <p className="mt-3 text-sm text-stone-600">
        The intake link may have been revoked or replaced with a newer one.
        Please reply to the email it came from, or contact our office at{" "}
        <a
          href="mailto:info@bigbangimmigration.com"
          className="text-[var(--navy)] underline-offset-2 hover:underline"
        >
          info@bigbangimmigration.com
        </a>{" "}
        for a fresh link.
      </p>
    </div>
  );
}
