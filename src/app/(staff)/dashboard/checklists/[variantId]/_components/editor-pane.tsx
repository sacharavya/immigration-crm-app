"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";

import {
  addTemplateDocument,
  removeGroupFromTemplate,
  reorderTemplateDocuments,
} from "../actions";

import { AddGroupDialog, type GroupOption } from "./add-group-dialog";
import { ItemRow, type ItemDraft } from "./item-row";

type Group = {
  code: string;
  name: string;
  displayOrder: number;
  items: ItemDraft[];
  // Tracks groups added in-session that haven't yet had an item saved.
  // The group "becomes real" once at least one item is inserted.
  pending: boolean;
};

export function EditorPane({
  templateId,
  state,
  readonly,
  initialGroups,
  groupOptions,
  onMutated,
}: {
  templateId: string;
  state: "active" | "scheduled" | "past";
  readonly: boolean;
  initialGroups: Group[];
  groupOptions: GroupOption[];
  onMutated: () => void;
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [pendingItem, startItemTransition] = useTransition();
  const [pendingReorder, startReorderTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const usedGroupCodes = useMemo(
    () => new Set(groups.map((g) => g.code)),
    [groups],
  );

  function addGroupLocally(code: string) {
    const opt = groupOptions.find((g) => g.code === code);
    if (!opt) return;
    setGroups((prev) =>
      prev.some((g) => g.code === code)
        ? prev
        : [
            ...prev,
            {
              code,
              name: opt.name,
              displayOrder: 1000,
              items: [],
              pending: true,
            },
          ],
    );
  }

  function removeGroup(groupCode: string) {
    setError(null);
    const target = groups.find((g) => g.code === groupCode);
    if (!target) return;

    if (target.pending) {
      // Group was added in-session and has no items — just drop it locally.
      setGroups((prev) => prev.filter((g) => g.code !== groupCode));
      return;
    }

    startItemTransition(async () => {
      const result = await removeGroupFromTemplate(templateId, groupCode);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setGroups((prev) => prev.filter((g) => g.code !== groupCode));
      onMutated();
    });
  }

  function moveItem(groupCode: string, itemId: string, direction: "up" | "down") {
    setError(null);
    setGroups((prev) =>
      prev.map((g) => {
        if (g.code !== groupCode) return g;
        const idx = g.items.findIndex((i) => i.id === itemId);
        if (idx < 0) return g;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= g.items.length) return g;
        const next = [...g.items];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        return { ...g, items: next };
      }),
    );
    // Persist the new order. Identify the group by code since groups state
    // already has the new order applied.
    startReorderTransition(async () => {
      const liveGroup = groups.find((g) => g.code === groupCode);
      if (!liveGroup) return;
      const idx = liveGroup.items.findIndex((i) => i.id === itemId);
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      const reordered = [...liveGroup.items];
      [reordered[idx], reordered[targetIdx]] = [
        reordered[targetIdx],
        reordered[idx],
      ];
      const result = await reorderTemplateDocuments(
        templateId,
        reordered.map((i) => i.id),
      );
      if ("error" in result) {
        setError(result.error);
        // Re-fetch to recover the canonical order.
        onMutated();
      }
    });
  }

  return (
    <div className="space-y-4">
      {state === "past" && (
        <Banner tone="muted">
          This version is no longer in effect. To make changes, create a new
          version.
        </Banner>
      )}
      {state === "active" && (
        <Banner tone="warn">
          Editing the active version affects new cases immediately. For
          non-trivial changes, consider creating a new version.
        </Banner>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-500">
          This checklist is empty. Click + Add group to start.
        </div>
      ) : (
        <div className="space-y-4">
          {groups
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((g) => (
              <GroupSection
                key={g.code}
                templateId={templateId}
                group={g}
                readonly={readonly}
                onItemAdded={(item) => {
                  setGroups((prev) =>
                    prev.map((prevG) =>
                      prevG.code === g.code
                        ? {
                            ...prevG,
                            items: [...prevG.items, item],
                            pending: false,
                          }
                        : prevG,
                    ),
                  );
                  onMutated();
                }}
                onItemRemoved={(itemId) => {
                  setGroups((prev) =>
                    prev.map((prevG) =>
                      prevG.code === g.code
                        ? {
                            ...prevG,
                            items: prevG.items.filter((i) => i.id !== itemId),
                          }
                        : prevG,
                    ),
                  );
                  onMutated();
                }}
                onMove={(itemId, direction) => moveItem(g.code, itemId, direction)}
                onSavedItem={onMutated}
                onRemoveGroup={() => removeGroup(g.code)}
              />
            ))}
        </div>
      )}

      {!readonly && (
        <div className="flex items-center justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddGroupOpen(true)}
            disabled={pendingItem || pendingReorder}
          >
            + Add group
          </Button>
        </div>
      )}

      <AddGroupDialog
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
        options={groupOptions}
        excludeCodes={usedGroupCodes}
        onPick={addGroupLocally}
      />
    </div>
  );
}

function GroupSection({
  templateId,
  group,
  readonly,
  onItemAdded,
  onItemRemoved,
  onMove,
  onSavedItem,
  onRemoveGroup,
}: {
  templateId: string;
  group: Group;
  readonly: boolean;
  onItemAdded: (item: ItemDraft) => void;
  onItemRemoved: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSavedItem: () => void;
  onRemoveGroup: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startAdd() {
    setAdding(true);
    setNewLabel("");
    setNewCode("");
    setError(null);
  }

  function submitAdd() {
    setError(null);
    const trimmedLabel = newLabel.trim();
    const trimmedCode = newCode.trim();
    if (!trimmedLabel || !trimmedCode) {
      setError("Label and code are required.");
      return;
    }
    if (!/^[A-Za-z0-9_]+$/.test(trimmedCode)) {
      setError("Code must use letters, numbers, or underscores only.");
      return;
    }

    startTransition(async () => {
      const result = await addTemplateDocument({
        templateId,
        groupCode: group.code,
        label: trimmedLabel,
        documentCode: trimmedCode,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onItemAdded({
        id: result.id,
        documentLabel: trimmedLabel,
        conditionLabel: null,
        allowedFileTypes: null,
        maxFileSizeMb: null,
        expectedQuantity: 1,
        instructions: null,
      });
      setAdding(false);
    });
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-stone-100 bg-stone-50/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-700">{group.name}</h3>
          {group.pending && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Pending — add an item to save
            </span>
          )}
        </div>
        {!readonly && (
          <button
            type="button"
            onClick={onRemoveGroup}
            aria-label="Remove group"
            className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      {group.items.length === 0 && !adding && (
        <p className="px-4 py-4 text-sm text-stone-500">
          No items yet.
        </p>
      )}

      {group.items.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {group.items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              readonly={readonly}
              isFirst={idx === 0}
              isLast={idx === group.items.length - 1}
              onSaved={onSavedItem}
              onRemoved={() => onItemRemoved(item.id)}
              onMove={(direction) => onMove(item.id, direction)}
            />
          ))}
        </ul>
      )}

      {!readonly && (
        <div className="border-t border-stone-100 bg-stone-50/30 p-3">
          {adding ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Item label (e.g. Passport bio page)"
                  disabled={pending}
                  className="flex-1"
                />
                <Input
                  value={newCode}
                  onChange={(e) =>
                    setNewCode(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 50),
                    )
                  }
                  placeholder="code (e.g. passport_bio)"
                  disabled={pending}
                  className="w-48 font-mono"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdding(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={submitAdd} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    "Add item"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={startAdd}>
              + Add item
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "warn" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        tone === "warn"
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-stone-200 bg-stone-50 text-stone-600",
      )}
    >
      {children}
    </div>
  );
}
