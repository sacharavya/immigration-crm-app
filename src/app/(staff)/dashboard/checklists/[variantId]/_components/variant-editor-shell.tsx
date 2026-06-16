"use client";

import { format } from "date-fns";
import {
  Loader2,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  ChecklistPreview,
  type ChecklistPreviewGroup,
} from "@/components/checklists/checklist-preview";
import { DeleteConfirmDialog } from "@/components/checklists/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";

import { deleteChecklist, updateVariant } from "../actions";

import {
  EditorPane,
} from "./editor-pane";
import type { GroupOption } from "./add-group-dialog";
import {
  LifecycleDialogs,
  type LifecycleDialogKind,
} from "./lifecycle-dialogs";
import { NewVersionDialog } from "./new-version-dialog";

export type VariantSummary = {
  id: string;
  name: string;
  description: string | null;
  typicalDurationDays: number | null;
  categoryName: string;
  subCategory: string | null;
  deactivatedAt: string | null;
  scheduledDeactivationAt: string | null;
  deactivationReason: string | null;
};

export type TemplateVersion = {
  id: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  state: "active" | "scheduled" | "past";
};

export type TemplateDocument = {
  id: string;
  documentCode: string;
  documentLabel: string;
  groupCode: string;
  conditionLabel: string | null;
  allowedFileTypes: string[] | null;
  maxFileSizeMb: number | null;
  instructions: string | null;
  expectedQuantity: number;
  displayOrder: number;
};

export type ChecklistGroupOption = {
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export function VariantEditorShell({
  variant,
  versions,
  selectedVersionId,
  selectedDocs,
  groupOptions,
  subCategorySuggestions,
  canDelete,
}: {
  variant: VariantSummary;
  versions: TemplateVersion[];
  selectedVersionId: string | null;
  selectedDocs: TemplateDocument[];
  groupOptions: ChecklistGroupOption[];
  subCategorySuggestions: string[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(variant.name);
  const [namePending, startNameTransition] = useTransition();
  const [nameError, setNameError] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState(variant.subCategory ?? "");
  const [subCategoryPending, startSubCategoryTransition] = useTransition();
  const [showSubCatSuggestions, setShowSubCatSuggestions] = useState(false);
  const [lifecycle, setLifecycle] = useState<LifecycleDialogKind>(null);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  function runDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteChecklist(variant.id);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      router.push("/dashboard/checklists");
    });
  }

  // Re-seed the inline-editable name when upstream data changes.
  useEffect(() => setName(variant.name), [variant.name]);
  useEffect(() => setSubCategory(variant.subCategory ?? ""), [variant.subCategory]);

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? null;

  function commitName() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === variant.name) {
      setName(variant.name);
      return;
    }
    startNameTransition(async () => {
      const result = await updateVariant({
        variantId: variant.id,
        name: trimmed,
      });
      if ("error" in result) {
        setNameError(result.error);
        setName(variant.name);
      } else {
        setNameError(null);
        setSavedAt(new Date());
      }
    });
  }

  function commitSubCategory() {
    const trimmed = subCategory.trim();
    const upstream = variant.subCategory ?? "";
    if (trimmed === upstream) return;
    startSubCategoryTransition(async () => {
      const result = await updateVariant({
        variantId: variant.id,
        subCategory: trimmed === "" ? null : trimmed,
      });
      if ("error" in result) {
        setSubCategory(variant.subCategory ?? "");
      } else {
        setSavedAt(new Date());
      }
    });
  }

  const subCatSuggestionsFiltered = useMemo(() => {
    const q = subCategory.trim().toLowerCase();
    if (!q) return [];
    return subCategorySuggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5);
  }, [subCategory, subCategorySuggestions]);

  function selectVersion(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("v", id);
    router.push(`${url.pathname}${url.search}`);
  }

  const status = useMemo(() => {
    if (variant.deactivatedAt) {
      return {
        kind: "deactivated" as const,
        label: "Deactivated",
        date: format(new Date(variant.deactivatedAt), "MMM d, yyyy"),
      };
    }
    if (variant.scheduledDeactivationAt) {
      return {
        kind: "scheduled_deactivation" as const,
        label: "Scheduled deactivation",
        date: format(
          new Date(variant.scheduledDeactivationAt),
          "MMM d, yyyy",
        ),
      };
    }
    const hasActive = versions.some((v) => v.state === "active");
    if (!hasActive) {
      return { kind: "no_active_checklist" as const, label: "No active checklist", date: null };
    }
    return { kind: "active" as const, label: "Active", date: null };
  }, [variant, versions]);

  const editorGroups = useMemo(() => {
    const byCode = new Map<
      string,
      ChecklistPreviewGroup & {
        items: ChecklistPreviewGroup["items"];
        rawItems: TemplateDocument[];
      }
    >();
    for (const d of selectedDocs) {
      const opt = groupOptions.find((g) => g.code === d.groupCode);
      const name = opt?.name ?? d.groupCode;
      const displayOrder = opt?.displayOrder ?? 1000;
      let g = byCode.get(d.groupCode);
      if (!g) {
        g = {
          code: d.groupCode,
          name,
          displayOrder,
          items: [],
          rawItems: [],
        };
        byCode.set(d.groupCode, g);
      }
      g.rawItems.push(d);
    }
    // Sort items within each group by display_order.
    for (const g of byCode.values()) {
      g.rawItems.sort((a, b) => a.displayOrder - b.displayOrder);
      g.items = g.rawItems.map((d) => ({
        id: d.id,
        documentLabel: d.documentLabel,
        conditionLabel: d.conditionLabel,
        instructions: d.instructions,
      }));
    }
    return Array.from(byCode.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }, [selectedDocs, groupOptions]);

  // Items shaped for the editor (mirrors the read-only preview but with the
  // full draftable data).
  const editorInitialGroups = editorGroups.map((g) => ({
    code: g.code,
    name: g.name,
    displayOrder: g.displayOrder,
    pending: false,
    items: g.rawItems.map((d) => ({
      id: d.id,
      documentLabel: d.documentLabel,
      conditionLabel: d.conditionLabel,
      allowedFileTypes: d.allowedFileTypes,
      maxFileSizeMb: d.maxFileSizeMb,
      expectedQuantity: d.expectedQuantity,
      instructions: d.instructions,
    })),
  }));

  const editorReadonly = !selectedVersion || selectedVersion.state === "past";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-stone-500">
            <Link
              href="/dashboard/checklists"
              className="hover:text-stone-800"
            >
              Checklists
            </Link>
            <span className="mx-1.5 text-stone-400">/</span>
            <span>{variant.categoryName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={namePending}
              className="h-auto w-auto min-w-[18rem] border-0 bg-transparent p-0 text-2xl font-bold tracking-tight text-[var(--navy)] shadow-none focus-visible:ring-0"
            />
            <StatusPill status={status} />
            {namePending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
            )}
          </div>
          {nameError && (
            <p role="alert" className="text-xs text-destructive">
              {nameError}
            </p>
          )}

          <div className="relative flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-stone-500">
              Sub category
            </span>
            <Input
              value={subCategory}
              onChange={(e) => {
                setSubCategory(e.target.value);
                setShowSubCatSuggestions(true);
              }}
              onFocus={() => setShowSubCatSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSubCatSuggestions(false), 150);
                commitSubCategory();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={subCategoryPending}
              placeholder="(none)"
              className="h-7 max-w-xs text-xs"
              autoComplete="off"
            />
            {subCategoryPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
            )}
            {showSubCatSuggestions && subCatSuggestionsFiltered.length > 0 && (
              <ul className="absolute left-[8.5rem] top-full z-10 mt-1 max-h-40 w-64 overflow-y-auto rounded-md border border-stone-200 bg-white py-1 text-xs shadow-lg">
                {subCatSuggestionsFiltered.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSubCategory(s);
                        setShowSubCatSuggestions(false);
                      }}
                      className="flex w-full items-center px-3 py-1.5 text-left hover:bg-stone-100"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <ActionMenu
          status={status.kind}
          canDelete={canDelete}
          onAction={(kind) => {
            if (kind === "delete") {
              setDeleteOpen(true);
              return;
            }
            setLifecycle({ kind });
          }}
        />
      </div>

      {/* Versions strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {versions.length === 0 ? (
            <p className="rounded-md border border-dashed border-stone-200 px-3 py-2 text-xs text-stone-500">
              No versions yet. Click + New version to create one.
            </p>
          ) : (
            versions.map((v) => (
              <VersionCard
                key={v.id}
                version={v}
                active={v.id === selectedVersionId}
                onClick={() => selectVersion(v.id)}
              />
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewVersionOpen(true)}
          >
            + New version
          </Button>
          <Link
            href="/dashboard/checklists"
            className={buttonVariants({ size: "sm" })}
          >
            Save and exit
          </Link>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-stone-700">
              Editor
            </h2>
            <p className="text-xs text-stone-500">
              {savedAt
                ? `All changes saved ${format(savedAt, "h:mm a")}`
                : "Edits autosave."}
            </p>
          </header>
          {selectedVersion ? (
            <>
              {editorReadonly && selectedVersion.state === "past" && (
                <ReadOnlyBanner
                  versions={versions}
                  currentVersionLabel={`v${selectedVersion.version}`}
                  onSwitch={(id) => selectVersion(id)}
                />
              )}
              <EditorPane
                templateId={selectedVersion.id}
                state={selectedVersion.state}
                readonly={editorReadonly}
                initialGroups={editorInitialGroups}
                groupOptions={groupOptions.map((g) => ({
                  code: g.code,
                  name: g.name,
                  isActive: g.isActive,
                }))}
                onMutated={() => setSavedAt(new Date())}
              />
            </>
          ) : (
            <p className="rounded-md border border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">
              This variant has no checklist version yet. Click + New version to
              create one.
            </p>
          )}
        </section>

        <section>
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-stone-700">
              Preview
            </h2>
            <p className="text-xs text-stone-500">
              How this checklist renders on the case detail page.
            </p>
          </header>
          <ChecklistPreview groups={editorGroups} />
        </section>
      </div>

      <LifecycleDialogs
        variantId={variant.id}
        open={lifecycle}
        onOpenChange={setLifecycle}
      />

      <NewVersionDialog
        variantId={variant.id}
        open={newVersionOpen}
        onOpenChange={setNewVersionOpen}
        onCreated={(templateId) => {
          // Switch the URL to the new version so the user lands on
          // it. router.refresh() forces the server component to re-
          // fetch — without it, Next.js can hand back a still-cached
          // render that's showing the OLD (now-clipped) version's
          // docs. Editing those would hit the "past versions are
          // read-only" gate even though the user just made a fresh
          // editable version.
          const url = new URL(window.location.href);
          url.searchParams.set("v", templateId);
          router.push(`${url.pathname}${url.search}`);
          router.refresh();
        }}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o) setDeleteError(null);
          setDeleteOpen(o);
        }}
        title="Delete this checklist?"
        description="This permanently removes the checklist and all its versions. In-flight cases will lose their template reference. Deactivate instead if you want to preserve history."
        warningLines={[
          "All versions and items are removed from the database.",
          "The audit log keeps a record of the deletion.",
          "Deactivation is reversible; deletion is not.",
        ]}
        expectedToken={variant.name}
        tokenLabel="Type the checklist name to confirm"
        pending={deletePending}
        error={deleteError}
        onConfirm={runDelete}
        confirmLabel="Delete checklist"
      />
    </div>
  );
}

function StatusPill({
  status,
}: {
  status:
    | { kind: "active"; label: string; date: null }
    | { kind: "scheduled_deactivation"; label: string; date: string }
    | { kind: "deactivated"; label: string; date: string }
    | { kind: "no_active_checklist"; label: string; date: null };
}) {
  const className =
    status.kind === "active"
      ? "bg-green-100 text-green-800"
      : status.kind === "scheduled_deactivation"
        ? "bg-amber-100 text-amber-800"
        : status.kind === "deactivated"
          ? "bg-stone-100 text-stone-700"
          : "bg-red-100 text-red-800";

  return (
    <span className="inline-flex flex-col items-start">
      <Badge className={cn(className, "rounded-full px-2.5 py-0.5 text-[11px] font-medium")}>
        {status.label}
      </Badge>
      {status.date && (
        <span className="mt-0.5 text-[11px] text-stone-500">
          {status.kind === "scheduled_deactivation" ? `on ${status.date}` : status.date}
        </span>
      )}
    </span>
  );
}

function VersionCard({
  version,
  active,
  onClick,
}: {
  version: TemplateVersion;
  active: boolean;
  onClick: () => void;
}) {
  const stateLabel =
    version.state === "active"
      ? "Active"
      : version.state === "scheduled"
        ? "Scheduled"
        : "Past";
  const dateLabel =
    version.state === "scheduled"
      ? `Starts ${format(new Date(version.effectiveFrom), "MMM d")}`
      : version.effectiveTo === null
        ? `Active since ${format(new Date(version.effectiveFrom), "MMM d, yyyy")}`
        : `From ${format(new Date(version.effectiveFrom), "MMM d, yyyy")} to ${format(new Date(version.effectiveTo), "MMM d, yyyy")}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-44 shrink-0 flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
        active
          ? "border-[var(--navy)] bg-blue-50"
          : "border-stone-200 bg-white hover:bg-stone-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-stone-900">
          v{version.version}
        </span>
        <Badge
          className={cn(
            "rounded-full px-2 py-0 text-[10px] font-medium",
            version.state === "active"
              ? "bg-green-100 text-green-800"
              : version.state === "scheduled"
                ? "bg-amber-100 text-amber-800"
                : "bg-stone-100 text-stone-600",
          )}
        >
          {stateLabel}
        </Badge>
      </div>
      <span className="text-[11px] text-stone-500">{dateLabel}</span>
    </button>
  );
}

function ActionMenu({
  status,
  canDelete,
  onAction,
}: {
  status: "active" | "scheduled_deactivation" | "deactivated" | "no_active_checklist";
  canDelete: boolean;
  onAction: (
    kind:
      | "schedule"
      | "cancel-schedule"
      | "deactivate-now"
      | "reactivate"
      | "delete",
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg"
        >
          {status !== "deactivated" && status !== "scheduled_deactivation" && (
            <MenuItem
              icon={<PauseCircle className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                onAction("schedule");
              }}
            >
              Schedule deactivation
            </MenuItem>
          )}
          {status === "scheduled_deactivation" && (
            <MenuItem
              icon={<XCircle className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                onAction("cancel-schedule");
              }}
            >
              Cancel scheduled deactivation
            </MenuItem>
          )}
          {status !== "deactivated" && (
            <MenuItem
              icon={<XCircle className="h-4 w-4" />}
              tone="destructive"
              onClick={() => {
                setOpen(false);
                onAction("deactivate-now");
              }}
            >
              Deactivate now
            </MenuItem>
          )}
          {status === "deactivated" && (
            <MenuItem
              icon={<PlayCircle className="h-4 w-4" />}
              onClick={() => {
                setOpen(false);
                onAction("reactivate");
              }}
            >
              Reactivate
            </MenuItem>
          )}
          {canDelete && (
            <>
              <div className="my-1 border-t border-stone-100" />
              <MenuItem
                icon={<Trash2 className="h-4 w-4" />}
                tone="destructive"
                onClick={() => {
                  setOpen(false);
                  onAction("delete");
                }}
              >
                Delete checklist
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Banner that fronts a past (read-only) version with a one-click
// jump to the newest editable version. Renders only when the
// selected template is in past state. Helps when staff lands on an
// older version (browser back button, stale bookmark, etc.) and
// can't figure out why edits aren't sticking.
function ReadOnlyBanner({
  versions,
  currentVersionLabel,
  onSwitch,
}: {
  versions: TemplateVersion[];
  currentVersionLabel: string;
  onSwitch: (templateId: string) => void;
}) {
  // Prefer the newest editable version — that's where the user
  // almost always wants to go.
  const newest = versions[versions.length - 1] ?? null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <div>
        You&rsquo;re viewing <strong>{currentVersionLabel}</strong>, which is
        a past version. Edits are disabled to protect historical cases.
      </div>
      {newest && newest.state !== "past" && (
        <button
          type="button"
          onClick={() => onSwitch(newest.id)}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          Open v{newest.version} (editable)
        </button>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
        tone === "destructive"
          ? "text-destructive hover:bg-red-50"
          : "text-stone-700 hover:bg-stone-100",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
