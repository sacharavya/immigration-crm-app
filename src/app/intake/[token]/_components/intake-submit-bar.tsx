"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { submitIntakeForm } from "../actions";

type Props = {
  sectionsComplete: number;
  sectionsTotal: number;
};

export function IntakeSubmitBar({ sectionsComplete, sectionsTotal }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitIntakeForm();
      if ("error" in res) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      // Reload so the now-locked row renders the SubmittedCard view.
      router.refresh();
    });
  }

  const ready = sectionsComplete === sectionsTotal;

  return (
    // On phones the bar collapses to a slim strip (count + button) so it
    // stops covering the questions being answered.
    <div className="sticky bottom-2 z-10 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg sm:bottom-4 sm:p-5">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">
            {ready
              ? "All sections complete"
              : `${sectionsComplete} of ${sectionsTotal} sections complete`}
          </h2>
          <p className="mt-1 hidden text-xs text-stone-600 sm:block">
            {ready
              ? "You can submit now, or keep editing — your answers are already saved."
              : "You can submit now, but we recommend completing every section first."}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-600">
                Submit — you won&rsquo;t be able to edit further. Sure?
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleClick} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Yes, submit
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={handleClick} disabled={pending}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              Submit intake form
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
