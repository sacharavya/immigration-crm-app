"use client";

import { Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  activeFilterCount,
  buildHref,
  type WorklistParams,
} from "./build-href";

type Option = { id: string; name: string };
type CitOption = { code: string; name: string };

const SORT_OPTIONS = [
  { value: "urgency", label: "Urgency" },
  { value: "recent", label: "Recently added" },
  { value: "name", label: "Name" },
  { value: "deadline", label: "Nearest deadline" },
];

export function WorklistToolbar({
  params,
  ownerOptions,
  serviceTypeOptions,
  citizenshipOptions,
}: {
  params: WorklistParams;
  ownerOptions: Option[];
  serviceTypeOptions: Option[];
  citizenshipOptions: CitOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState(params.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterCount = activeFilterCount(params);

  function pushSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildHref(params, { q: value.trim() || null }));
    }, 350);
  }

  const hasAnyFilter = filterCount > 0;

  // Build chip list
  const chips: { label: string; clearHref: string }[] = [];
  if (params.owner) {
    const name = ownerOptions.find((o) => o.id === params.owner)?.name ?? params.owner;
    chips.push({ label: `Owner: ${name}`, clearHref: buildHref(params, { owner: null }) });
  }
  if (params.stage) {
    chips.push({ label: `Stage: ${params.stage.replace(/,/g, ", ")}`, clearHref: buildHref(params, { stage: null }) });
  }
  if (params.service) {
    const names = params.service.split(",").map((id) => serviceTypeOptions.find((o) => o.id === id)?.name ?? id).join(", ");
    chips.push({ label: `Service: ${names}`, clearHref: buildHref(params, { service: null }) });
  }
  if (params.imm_status) {
    chips.push({ label: `Status: ${params.imm_status.replace(/,/g, ", ").replace(/_/g, " ")}`, clearHref: buildHref(params, { imm_status: null }) });
  }
  if (params.citizenship) {
    const names = params.citizenship.split(",").map((c) => citizenshipOptions.find((o) => o.code === c)?.name ?? c).join(", ");
    chips.push({ label: `Citizenship: ${names}`, clearHref: buildHref(params, { citizenship: null }) });
  }
  if (params.expiry) {
    chips.push({ label: `Expiry: ${params.expiry === "expired" ? "Expired" : `within ${params.expiry}d`}`, clearHref: buildHref(params, { expiry: null }) });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pushSearch(e.target.value);
            }}
            placeholder="Search name, email, or client #"
            className="h-8 w-full border border-stone-200 bg-white pl-8 pr-3 text-sm"
          />
        </div>

        {/* Sort */}
        <select
          value={params.sort ?? "urgency"}
          onChange={(e) =>
            router.push(
              buildHref(params, {
                sort: e.target.value === "urgency" ? null : e.target.value,
              }),
            )
          }
          className="h-8 border border-stone-200 bg-white px-2 text-xs text-stone-700"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>

        {/* Quick filter: Owner */}
        <select
          value={params.owner ?? ""}
          onChange={(e) =>
            router.push(buildHref(params, { owner: e.target.value || null }))
          }
          className="h-8 border border-stone-200 bg-white px-2 text-xs text-stone-700"
        >
          <option value="">All owners</option>
          {ownerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {/* Quick filter: Stage */}
        <select
          value={params.stage ?? ""}
          onChange={(e) =>
            router.push(buildHref(params, { stage: e.target.value || null }))
          }
          className="h-8 border border-stone-200 bg-white px-2 text-xs text-stone-700"
        >
          <option value="">All stages</option>
          <option value="lead">Lead</option>
          <option value="retained">Retained</option>
          <option value="preparing">Preparing</option>
          <option value="submitted">Submitted</option>
          <option value="decision">Decision</option>
          <option value="closed">Closed</option>
        </select>

        {/* Quick filter: Status expiry */}
        <select
          value={params.expiry ?? ""}
          onChange={(e) =>
            router.push(buildHref(params, { expiry: e.target.value || null }))
          }
          className="h-8 border border-stone-200 bg-white px-2 text-xs text-stone-700"
        >
          <option value="">Expiry: Any</option>
          <option value="30">Within 30 days</option>
          <option value="60">Within 60 days</option>
          <option value="90">Within 90 days</option>
          <option value="expired">Expired</option>
        </select>

        {hasAnyFilter && (
          <Link
            href="/dashboard/clients"
            className="inline-flex h-8 items-center gap-1 px-2 text-xs text-stone-500 hover:text-stone-800"
          >
            <X className="h-3 w-3" /> Clear all
          </Link>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.clearHref}
              className="inline-flex items-center gap-1 border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-50"
            >
              {chip.label}
              <X className="h-3 w-3 text-stone-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
