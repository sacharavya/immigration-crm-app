import { ClientDocRow, type ClientRequirement } from "./client-doc-row";

// ---------------------------------------------------------------------------
// Client-facing triage checklist. Same requirements and files as the staff
// checklist, projected into five plain-language groups led by the few things
// the client must act on. All grouping is derived from the data.
// ---------------------------------------------------------------------------

type Bucket = "replace" | "toUpload" | "received" | "done" | "optional";

function bucketOf(r: ClientRequirement): Bucket {
  if (r.files.some((f) => f.state === "replace")) return "replace";
  if (r.files.length === 0) return r.required ? "toUpload" : "optional";
  if (r.files.every((f) => f.state === "done")) return "done";
  return "received";
}

const GROUP_ORDER: Bucket[] = [
  "replace",
  "toUpload",
  "received",
  "done",
  "optional",
];

const GROUP_META: Record<Bucket, { title: string; dot: string }> = {
  replace: {
    title: "Please replace",
    dot: "bg-[var(--destructive-text)]",
  },
  toUpload: {
    title: "Still to upload",
    dot: "bg-[var(--warning-text)]",
  },
  received: {
    title: "Received, we are reviewing",
    dot: "bg-[var(--success-text)]",
  },
  done: {
    title: "Done",
    dot: "bg-[var(--success)]",
  },
  optional: {
    title: "Optional, only if you have them",
    dot: "bg-[var(--subtle-foreground)]",
  },
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function triageSentence(replace: number, toUpload: number): string {
  if (replace === 0 && toUpload === 0) {
    return "You are all set. Everything has been received or is optional.";
  }
  const parts: string[] = [];
  if (replace > 0) parts.push(`${plural(replace, "document", "documents")} to fix`);
  if (toUpload > 0) {
    parts.push(`${plural(toUpload, "document", "documents")} still to upload`);
  }
  return `You have ${parts.join(" and ")}. Everything else is received or optional.`;
}

function GroupCard({
  bucket,
  requirements,
  token,
}: {
  bucket: Bucket;
  requirements: ClientRequirement[];
  token: string;
}) {
  const meta = GROUP_META[bucket];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span aria-hidden className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <h2 className="text-sm font-semibold text-foreground">{meta.title}</h2>
        <span className="text-xs text-[var(--subtle-foreground)]">
          {requirements.length}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {requirements.map((r) => (
          <ClientDocRow key={r.code} token={token} requirement={r} />
        ))}
      </ul>
    </section>
  );
}

export function ClientChecklist({
  token,
  requirements,
}: {
  token: string;
  requirements: ClientRequirement[];
}) {
  const byBucket = new Map<Bucket, ClientRequirement[]>();
  for (const r of requirements) {
    const b = bucketOf(r);
    const list = byBucket.get(b) ?? [];
    list.push(r);
    byBucket.set(b, list);
  }

  const replaceCount = byBucket.get("replace")?.length ?? 0;
  const toUploadCount = byBucket.get("toUpload")?.length ?? 0;
  const optional = byBucket.get("optional") ?? [];

  return (
    <div className="space-y-4">
      {/* Triage summary: one plain sentence of what is left. */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
        {triageSentence(replaceCount, toUploadCount)}
      </div>

      {GROUP_ORDER.filter((b) => b !== "optional").map((bucket) => {
        const reqs = byBucket.get(bucket);
        if (!reqs || reqs.length === 0) return null;
        return (
          <GroupCard
            key={bucket}
            bucket={bucket}
            requirements={reqs}
            token={token}
          />
        );
      })}

      {/* Optional tail: collapsed by default into one expandable line. */}
      {optional.length > 0 && (
        <details className="overflow-hidden rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${GROUP_META.optional.dot}`}
            />
            {GROUP_META.optional.title}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-[var(--subtle-foreground)]">
              {optional.length}
            </span>
          </summary>
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            These are not required. Add any you happen to have, or leave them.
          </p>
          <ul className="divide-y divide-border border-t border-border">
            {optional.map((r) => (
              <ClientDocRow key={r.code} token={token} requirement={r} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
