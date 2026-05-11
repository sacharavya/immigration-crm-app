"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

type StaffPick = { id: string; name: string };

type Props = {
  from: string | null;
  to: string | null;
  schema: string | null;
  table: string | null;
  op: string | null;
  actorId: string | null;
  q: string;
  schemaOptions: string[];
  tableOptions: string[];
  staffOptions: StaffPick[];
};

const SEARCH_DEBOUNCE_MS = 350;

export function AuditFilters({
  from,
  to,
  schema,
  table,
  op,
  actorId,
  q,
  schemaOptions,
  tableOptions,
  staffOptions,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  useEffect(() => setSearch(q), [q]);
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
    const f = next.from === undefined ? from : next.from;
    if (f) params.set("from", f);
    const t = next.to === undefined ? to : next.to;
    if (t) params.set("to", t);
    const s = next.schema === undefined ? schema : next.schema;
    if (s) params.set("schema", s);
    const tb = next.table === undefined ? table : next.table;
    if (tb) params.set("table", tb);
    const o = next.op === undefined ? op : next.op;
    if (o) params.set("op", o);
    const a = next.actorId === undefined ? actorId : next.actorId;
    if (a) params.set("actor", a);
    const qq = next.q === undefined ? q : next.q;
    if (qq.trim()) params.set("q", qq.trim());
    const qs = params.toString();
    return qs ? `/dashboard/audit?${qs}` : "/dashboard/audit";
  }

  function pushNow(next: Partial<Props>) {
    router.push(buildHref(next));
  }

  const hasFilters =
    Boolean(from) ||
    Boolean(to) ||
    Boolean(schema) ||
    Boolean(table) ||
    Boolean(op) ||
    Boolean(actorId) ||
    search.trim().length > 0;

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
      <Field label="Schema">
        <select
          value={schema ?? ""}
          onChange={(e) => pushNow({ schema: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Any</option>
          {schemaOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Table">
        <select
          value={table ?? ""}
          onChange={(e) => pushNow({ table: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Any</option>
          {tableOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Operation">
        <select
          value={op ?? ""}
          onChange={(e) => pushNow({ op: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Any</option>
          <option value="I">Insert</option>
          <option value="U">Update</option>
          <option value="D">Delete</option>
        </select>
      </Field>
      <Field label="Actor">
        <select
          value={actorId ?? ""}
          onChange={(e) => pushNow({ actorId: e.target.value || null })}
          className="h-8 rounded-md border border-stone-200 bg-white px-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Anyone</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Search">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Row ID or column name"
          className="h-8 w-56"
        />
      </Field>
      {hasFilters && (
        <Link
          href="/dashboard/audit"
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
