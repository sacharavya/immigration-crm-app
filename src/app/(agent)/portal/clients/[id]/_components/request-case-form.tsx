"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { requestCase } from "../actions";

type ServiceOption = { id: string; name: string };

const selectClass =
  "h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20";

export function RequestCaseForm({
  clientId,
  services,
}: {
  clientId: string;
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await requestCase({ clientId, serviceTypeId, note });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setServiceTypeId("");
      setNote("");
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="request-service"
          className="text-xs font-medium text-stone-600"
        >
          Service (optional)
        </label>
        <select
          id="request-service"
          value={serviceTypeId}
          onChange={(e) => {
            setServiceTypeId(e.target.value);
            setDone(false);
          }}
          className={selectClass}
        >
          <option value="">Let the firm decide</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="request-note"
          className="text-xs font-medium text-stone-600"
        >
          Note (optional)
        </label>
        <textarea
          id="request-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDone(false);
          }}
          rows={3}
          maxLength={2000}
          placeholder="Anything the firm should know to get started."
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {done && !error && (
        <p className="text-sm text-[var(--success-text)]">
          Request sent. The firm will review it and open the case.
        </p>
      )}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Request case
      </Button>
    </div>
  );
}
