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
    <div className="sticky bottom-4 z-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            {ready ? "All sections complete" : "Almost there"}
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            {ready
              ? "You can submit now, or keep editing — your answers are already saved."
              : `${sectionsComplete} of ${sectionsTotal} sections complete. You can submit now, but we recommend completing every section first.`}
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
