"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils/index";

import { deleteCategory, updateCategory } from "../actions";

import type { VariantStatusKind } from "./variant-table";

const STATUS_PILL: Record<VariantStatusKind, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  scheduled_deactivation: {
    label: "Scheduled",
    className: "bg-amber-100 text-amber-800",
  },
  deactivated: { label: "Deactivated", className: "bg-stone-100 text-stone-700" },
  no_active_checklist: {
    label: "No active checklist",
    className: "bg-red-100 text-red-800",
  },
};

export type ChecklistRowMini = {
  id: string;
  name: string;
  subCategory: string | null;
  statusKind: VariantStatusKind;
  statusDate: string | null;
  activeVersion: string | null;
  futureVersionLabel: string | null;
  inFlightCases: number;
  lastEdited: string;
};

export type CategoryCardData = {
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  checklists: ChecklistRowMini[];
};

export function CategoryCard({
  category,
  onAddChecklist,
}: {
  category: CategoryCardData;
  onAddChecklist: (categoryCode: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const checklistCount = category.checklists.length;
  const canDelete = checklistCount === 0;

  return (
    <>
      {/* Default Card ring is a 10%-opacity hairline; categories need a
          visible boundary. */}
      <Card className="border border-stone-300 ring-0">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="-mx-5 -my-3 flex flex-1 items-center gap-3 rounded-md px-5 py-3 text-left transition-colors hover:bg-stone-50"
            >
              <span aria-hidden className="text-stone-400">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>

              <div className="flex-1">
                <h2 className="text-sm font-medium text-[var(--navy)]">
                  {category.name}{" "}
                  <span className="text-stone-500">({checklistCount})</span>
                </h2>
                {category.description && (
                  <p className="text-xs text-stone-500">{category.description}</p>
                )}
              </div>
            </button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canDelete && setDeleting(true)}
                disabled={!canDelete}
                title={
                  canDelete
                    ? undefined
                    : `Cannot delete: ${checklistCount} checklist${checklistCount === 1 ? "" : "s"} in this category.`
                }
                className="text-destructive hover:text-destructive disabled:text-stone-400"
              >
                Delete
              </Button>
            </div>
          </div>

          {open && (
            <div className="border-t border-stone-100 bg-stone-50/30 px-5 py-4">
              {checklistCount === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-200 bg-white px-4 py-6 text-center">
                  <p className="text-sm text-stone-500">
                    No checklists in this category yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddChecklist(category.code)}
                    className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-2`}
                  >
                    + Add checklist
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {category.checklists.map((c) => (
                    <ChecklistRowItem key={c.id} checklist={c} />
                  ))}
                </ul>
              )}

              {checklistCount > 0 && (
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => onAddChecklist(category.code)}
                    className="text-xs font-medium text-[var(--navy)] underline-offset-2 hover:underline"
                  >
                    + Add checklist to this category
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EditCategoryDialog
        open={editing}
        onOpenChange={setEditing}
        category={category}
      />
      <DeleteCategoryDialog
        open={deleting}
        onOpenChange={setDeleting}
        category={category}
      />
    </>
  );
}

function ChecklistRowItem({ checklist: c }: { checklist: ChecklistRowMini }) {
  const pill = STATUS_PILL[c.statusKind];
  return (
    <li>
      <Link
        href={`/dashboard/checklists/${c.id}`}
        className="flex items-start gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 transition-colors hover:bg-stone-50"
      >
        <span aria-hidden className="mt-1 text-stone-400">
          •
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-stone-900">{c.name}</div>
          {c.subCategory && (
            <div className="text-xs text-stone-500">{c.subCategory}</div>
          )}
        </div>

        <div className="hidden flex-col items-end gap-0 text-right sm:flex">
          <Badge
            className={cn(
              pill.className,
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            )}
          >
            {pill.label}
          </Badge>
          {c.statusDate && (
            <span className="text-[11px] text-stone-500">
              {c.statusKind === "scheduled_deactivation"
                ? `on ${c.statusDate}`
                : c.statusDate}
            </span>
          )}
        </div>

        <div className="hidden w-20 text-right text-xs text-stone-600 md:block">
          <div className="font-medium tabular-nums">
            {c.activeVersion ?? "—"}
          </div>
          {c.futureVersionLabel && (
            <div className="text-[11px] text-stone-500">
              {c.futureVersionLabel}
            </div>
          )}
        </div>

        <div className="hidden w-16 text-right text-xs text-stone-600 md:block">
          <div className="font-medium tabular-nums">{c.inFlightCases}</div>
          <div className="text-[11px] text-stone-500">in-flight</div>
        </div>

        <div className="hidden w-28 text-right text-xs text-stone-500 lg:block">
          {c.lastEdited}
        </div>

        <span
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} pointer-events-none`}
        >
          Edit
        </span>
      </Link>
    </li>
  );
}

function EditCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: CategoryCardData;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(category.name);
    setDescription(category.description ?? "");
    setError(null);
  }, [open, category]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateCategory({
        categoryCode: category.code,
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Code is immutable to avoid orphaning checklists.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ec-name">Name</FieldLabel>
            <Input
              id="ec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              disabled={pending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ec-description">
              Description (optional)
            </FieldLabel>
            <textarea
              id="ec-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={pending}
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
            />
          </Field>

          <div className="text-xs text-stone-500">
            Code: <span className="font-mono">{category.code}</span> · cannot
            be changed
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || name.trim() === ""}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: CategoryCardData;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.code);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{category.name}&quot;?</DialogTitle>
          <DialogDescription>
            Permanently removes this category. The audit log keeps a record.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
