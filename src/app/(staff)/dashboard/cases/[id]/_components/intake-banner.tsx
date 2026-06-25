"use client";

import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Banner shown on the case detail page when the client's intake form
// has unfilled sections. Dismissible per session (sessionStorage), not
// permanently — closing it doesn't suppress it on the next page load.

export function IntakeBanner({
  clientId,
  missing,
  total,
}: {
  clientId: string;
  missing: number;
  total: number;
}) {
  const storageKey = `intake-banner-dismissed:${clientId}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(storageKey) === "1";
    setHidden(dismissed);
  }, [storageKey]);

  if (hidden) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }
    setHidden(true);
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-l-4 border-[var(--warning-subtle)] border-l-[var(--warning)] bg-[var(--warning-subtle)] px-4 py-3 text-sm text-[var(--warning-text)]"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <strong className="font-semibold">Intake form is incomplete.</strong>{" "}
        {missing} of {total} sections still need attention.
      </div>
      <Link
        href={`/dashboard/clients/${clientId}/intake`}
        className="rounded-md border border-[var(--warning)]/40 bg-card px-3 py-1 text-xs font-medium text-[var(--warning-text)] hover:bg-card/70"
      >
        Complete intake
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-1 rounded-md p-1 text-[var(--warning-text)]/70 hover:bg-[var(--warning)]/10 hover:text-[var(--warning-text)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
