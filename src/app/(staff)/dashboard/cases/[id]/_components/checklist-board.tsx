"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  deriveRequirementState,
  itemReceived,
  type RequirementState,
} from "@/lib/files/document-display";
import { cn } from "@/lib/utils/index";

import { reviewDocument } from "../actions";

import type { FileRow, TemplateDoc } from "./document-checklist";
import { DocumentRow } from "./document-row";

type Props = {
  caseId: string;
  templateDocs: TemplateDoc[];
  // Plain records (Maps are converted at the server boundary).
  liveByCode: Record<string, FileRow[]>;
  historyByCode: Record<string, FileRow[]>;
  reviewerNameById: Record<string, string>;
  canEditRequired: boolean;
  canReview: boolean;
  canUpload: boolean;
  caseShareToken?: string | null;
  clientEmail?: string | null;
  shareButtonSlot?: React.ReactNode;
};

type Entry = {
  doc: TemplateDoc;
  files: FileRow[];
  history: FileRow[];
  state: RequirementState;
};

type GroupBy = "status" | "category";
type Chip = "awaiting" | "needs_client" | "required";

const STATUS_GROUPS: {
  key: RequirementState;
  title: string;
  dot: string;
}[] = [
  { key: "awaiting_review", title: "Awaiting your review", dot: "var(--warning)" },
  { key: "needs_new_file", title: "Waiting on the client", dot: "var(--destructive)" },
  { key: "collected", title: "Collected", dot: "var(--success)" },
];

export function ChecklistBoard({
  caseId,
  templateDocs,
  liveByCode,
  historyByCode,
  reviewerNameById,
  canEditRequired,
  canReview,
  canUpload,
  caseShareToken,
  clientEmail,
  shareButtonSlot,
}: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [activeChip, setActiveChip] = useState<Chip | null>(null);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [approveAllPending, startApproveAll] = useTransition();

  const entries = useMemo<Entry[]>(
    () =>
      templateDocs.map((doc) => {
        const files = liveByCode[doc.document_code] ?? [];
        return {
          doc,
          files,
          history: historyByCode[doc.document_code] ?? [],
          state: deriveRequirementState(files),
        };
      }),
    [templateDocs, liveByCode, historyByCode],
  );

  const receivedCount = entries.filter((e) => itemReceived(e.files)).length;
  const awaiting = entries.filter((e) => e.state === "awaiting_review");
  const needsClient = entries.filter((e) => e.state === "needs_new_file");
  const requiredEntries = entries.filter((e) => e.doc.is_required);
  const requiredIn = requiredEntries.filter((e) => itemReceived(e.files)).length;

  function categoryLabelFor(doc: TemplateDoc): string {
    return doc.group?.name ?? doc.group_code;
  }

  function renderRow(e: Entry) {
    return (
      <DocumentRow
        key={e.doc.document_code}
        caseId={caseId}
        templateDoc={{
          document_code: e.doc.document_code,
          document_label: e.doc.document_label,
          is_required: e.doc.is_required,
          condition_label: e.doc.condition_label,
          instructions: e.doc.instructions,
          allows_multiple: e.doc.allows_multiple ?? false,
        }}
        files={e.files}
        history={e.history}
        reviewerNameById={reviewerNameById}
        categoryLabel={categoryLabelFor(e.doc)}
        canEditRequired={canEditRequired}
        canReview={canReview}
        canUpload={canUpload}
        caseShareToken={caseShareToken}
        clientEmail={clientEmail}
      />
    );
  }

  function handleApproveAll() {
    const ids = awaiting
      .flatMap((e) => e.files)
      .filter((f) => f.status === "uploaded")
      .map((f) => f.id);
    if (ids.length === 0) return;
    startApproveAll(async () => {
      await Promise.all(
        ids.map((id) => reviewDocument({ documentId: id, decision: "accept" })),
      );
    });
  }

  // Filtered (chip) view: a flat list of the matching entries.
  const chipFiltered: Entry[] | null =
    activeChip === "awaiting"
      ? awaiting
      : activeChip === "needs_client"
        ? needsClient
        : activeChip === "required"
          ? requiredEntries
          : null;

  // Category groups (data-driven), ordered by the group's display order.
  const categoryGroups = useMemo(() => {
    const byCode = new Map<
      string,
      { code: string; name: string; order: number; entries: Entry[] }
    >();
    for (const e of entries) {
      const code = e.doc.group_code;
      const g = byCode.get(code) ?? {
        code,
        name: e.doc.group?.name ?? code,
        order: e.doc.group?.display_order ?? 1000,
        entries: [],
      };
      g.entries.push(e);
      byCode.set(code, g);
    }
    return [...byCode.values()].sort((a, b) => a.order - b.order);
  }, [entries]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Document checklist
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted-foreground)]">
            {receivedCount} of {templateDocs.length} received
          </span>
          {shareButtonSlot}
        </div>
      </div>

      {templateDocs.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No documents in this service template.
        </p>
      ) : (
        <>
          {/* Triage chips + group-by */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {awaiting.length > 0 && (
              <TriageChip
                active={activeChip === "awaiting"}
                tone="warning"
                onClick={() =>
                  setActiveChip((c) => (c === "awaiting" ? null : "awaiting"))
                }
              >
                {awaiting.length} awaiting your review
              </TriageChip>
            )}
            {needsClient.length > 0 && (
              <TriageChip
                active={activeChip === "needs_client"}
                tone="destructive"
                onClick={() =>
                  setActiveChip((c) =>
                    c === "needs_client" ? null : "needs_client",
                  )
                }
              >
                {needsClient.length} need the client
              </TriageChip>
            )}
            {requiredEntries.length > 0 && (
              <TriageChip
                active={activeChip === "required"}
                tone="success"
                onClick={() =>
                  setActiveChip((c) => (c === "required" ? null : "required"))
                }
              >
                {requiredIn} of {requiredEntries.length} required in
              </TriageChip>
            )}

            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="text-[var(--subtle-foreground)]">Group by</span>
              <GroupByButton
                active={groupBy === "status"}
                onClick={() => setGroupBy("status")}
              >
                Status
              </GroupByButton>
              <GroupByButton
                active={groupBy === "category"}
                onClick={() => setGroupBy("category")}
              >
                Category
              </GroupByButton>
            </div>
          </div>

          {/* Chip-filtered flat list */}
          {chipFiltered ? (
            chipFiltered.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nothing in this set.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {chipFiltered.map(renderRow)}
              </ul>
            )
          ) : groupBy === "status" ? (
            <div className="space-y-6">
              {STATUS_GROUPS.map((g) => {
                const groupEntries = entries.filter((e) => e.state === g.key);
                if (groupEntries.length === 0) return null;
                return (
                  <section key={g.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <GroupHeader dot={g.dot} title={g.title} />
                      {g.key === "awaiting_review" && canReview && (
                        <button
                          type="button"
                          onClick={handleApproveAll}
                          disabled={approveAllPending}
                          className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--navy)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--navy-800)] disabled:opacity-60"
                        >
                          {approveAllPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Approve all"
                          )}
                        </button>
                      )}
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {groupEntries.map(renderRow)}
                    </ul>
                  </section>
                );
              })}

              {/* Collapsed Optional and not uploaded */}
              {(() => {
                const tail = entries.filter((e) => e.state === "not_uploaded");
                if (tail.length === 0) return null;
                return (
                  <section>
                    <button
                      type="button"
                      onClick={() => setOptionalOpen((v) => !v)}
                      aria-expanded={optionalOpen}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <GroupHeader
                        dot="var(--subtle-foreground)"
                        title={`Optional and not uploaded (${tail.length})`}
                      />
                      <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                        {optionalOpen ? "Hide" : "Show"}
                      </span>
                    </button>
                    {optionalOpen && (
                      <ul className="mt-2 divide-y divide-[var(--border)]">
                        {tail.map(renderRow)}
                      </ul>
                    )}
                  </section>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-6">
              {categoryGroups.map((g) => (
                <section key={g.code}>
                  <GroupHeader dot="var(--navy-400)" title={g.name} />
                  <ul className="mt-2 divide-y divide-[var(--border)]">
                    {g.entries.map(renderRow)}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroupHeader({ dot, title }: { dot: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--subtle-foreground)]">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: dot }}
      />
      {title}
    </h3>
  );
}

function TriageChip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "warning" | "destructive" | "success";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "warning"
      ? "bg-[var(--warning-subtle)] text-[var(--warning-text)]"
      : tone === "destructive"
        ? "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]"
        : "bg-[var(--success-subtle)] text-[var(--success-text)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        toneCls,
        active && "ring-2 ring-[var(--navy)] ring-offset-1",
      )}
    >
      {children}
    </button>
  );
}

function GroupByButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-2 py-1 font-medium",
        active
          ? "bg-[var(--navy)] text-white"
          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]",
      )}
    >
      {children}
    </button>
  );
}
