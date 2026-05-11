"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
} from "@/lib/validators/payment";

type ProofFilter = "all" | "with" | "without";

type Props = {
  from: string | null;
  to: string | null;
  method: PaymentMethod | null;
  q: string;
  proof: ProofFilter;
};

const SEARCH_DEBOUNCE_MS = 350;

export function PaymentsFilters({ from, to, method, q, proof }: Props) {
  const router = useRouter();
  // The search box is debounced; everything else fires immediately on
  // change. Local state keeps typing snappy, the URL catches up after
  // a brief pause.
  const [search, setSearch] = useState(q);

  // Keep local state in sync if a back/forward navigation lands us on
  // a different ?q= value.
  useEffect(() => {
    setSearch(q);
  }, [q]);

  // Debounced push for the search input.
  useEffect(() => {
    if (search === q) return;
    const handle = window.setTimeout(() => {
      router.push(buildHref({ q: search }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function buildHref(next: Partial<Props>) {
    const params = new URLSearchParams();
    const nextFrom = next.from === undefined ? from : next.from;
    if (nextFrom) params.set("from", nextFrom);
    const nextTo = next.to === undefined ? to : next.to;
    if (nextTo) params.set("to", nextTo);
    const nextMethod = next.method === undefined ? method : next.method;
    if (nextMethod) params.set("method", nextMethod);
    const nextQ = next.q === undefined ? q : next.q;
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const nextProof = next.proof === undefined ? proof : next.proof;
    if (nextProof !== "all") params.set("proof", nextProof);
    const qs = params.toString();
    return qs ? `/dashboard/payments?${qs}` : "/dashboard/payments";
  }

  function pushNow(next: Partial<Props>) {
    router.push(buildHref(next));
  }

  const hasFilters =
    Boolean(from) ||
    Boolean(to) ||
    Boolean(method) ||
    search.trim().length > 0 ||
    proof !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <Field label="From">
        <Input
          type="date"
          value={from ?? ""}
          onChange={(e) => pushNow({ from: e.target.value || null })}
          className="h-8 w-40"
        />
      </Field>
      <Field label="To">
        <Input
          type="date"
          value={to ?? ""}
          onChange={(e) => pushNow({ to: e.target.value || null })}
          className="h-8 w-40"
        />
      </Field>
      <Field label="Method">
        <select
          value={method ?? ""}
          onChange={(e) =>
            pushNow({
              method: (e.target.value || null) as PaymentMethod | null,
            })
          }
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Any</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABEL[m]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Proof">
        <select
          value={proof}
          onChange={(e) =>
            pushNow({ proof: e.target.value as ProofFilter })
          }
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="all">Any</option>
          <option value="with">With proof</option>
          <option value="without">Missing proof</option>
        </select>
      </Field>
      <Field label="Search">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Case # or client name"
          className="h-8 w-56"
        />
      </Field>
      {hasFilters && (
        <Link
          href="/dashboard/payments"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3 w-3" />
          Clear
        </Link>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}
