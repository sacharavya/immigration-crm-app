"use client";

import { Menu } from "@base-ui/react/menu";
import {
  Check,
  Flag,
  Link2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Repeat,
  Trash2,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteConfirmDialog } from "@/components/checklists/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";

import { deleteCase, setCasePriority } from "../actions";
import { RcicPickerDialog } from "./rcic-picker-dialog";
import type { StaffOption } from "./team";

type PriorityLevel = "normal" | "high" | "critical";

const PRIORITY_OPTIONS: ReadonlyArray<{ value: PriorityLevel; label: string }> = [
  { value: "normal", label: "None" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--subtle-foreground)] data-[disabled]:data-[highlighted]:bg-transparent";

export function CaseOverflowMenu({
  caseId,
  caseNumber,
  rcicId,
  rcicOptions,
  priority,
  canEdit,
  canDelete,
}: {
  caseId: string;
  caseNumber: string;
  rcicId: string | null;
  rcicOptions: StaffOption[];
  priority: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const currentPriority: PriorityLevel =
    priority === "high" || priority === "critical" ? priority : "normal";

  function changePriority(next: PriorityLevel) {
    if (next === currentPriority) return;
    startTransition(async () => {
      const result = await setCasePriority({ caseId, priority: next });
      if (!("error" in result)) router.refresh();
    });
  }

  function copyLink() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function runDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteCase(caseId);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      router.push("/dashboard/cases");
    });
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button variant="outline" size="icon" aria-label="More actions" />
          }
        >
          <MoreHorizontal />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="min-w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
              <Menu.Item className={itemClass} disabled title="Coming soon">
                <Pencil className="h-4 w-4" />
                Edit case details
              </Menu.Item>
              <Menu.Item
                className={itemClass}
                onClick={() => setReassignOpen(true)}
              >
                <UserCog className="h-4 w-4" />
                Change RCIC of record
              </Menu.Item>
              {canEdit && (
                <Menu.SubmenuRoot>
                  <Menu.SubmenuTrigger className={itemClass}>
                    <Flag className="h-4 w-4" />
                    Set priority
                    <span className="ml-auto text-xs text-[var(--subtle-foreground)]">
                      {PRIORITY_OPTIONS.find((o) => o.value === currentPriority)?.label}
                    </span>
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner sideOffset={2} align="start" className="z-50">
                      <Menu.Popup className="min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
                        {PRIORITY_OPTIONS.map((o) => (
                          <Menu.Item
                            key={o.value}
                            className={itemClass}
                            onClick={() => changePriority(o.value)}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                o.value === currentPriority
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {o.label}
                          </Menu.Item>
                        ))}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              )}
              <Menu.Item className={itemClass} disabled title="Coming soon">
                <Repeat className="h-4 w-4" />
                Change service type
              </Menu.Item>
              <Menu.Item className={itemClass} disabled title="Coming soon">
                <PauseCircle className="h-4 w-4" />
                Put case on hold
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--success-text)]" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copied ? "Link copied" : "Copy link to case"}
              </Menu.Item>

              {canDelete && (
                <>
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Item
                    className={`${itemClass.replace(
                      "text-foreground",
                      "text-[var(--destructive)]",
                    )} data-[highlighted]:bg-[var(--maple-50)]`}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete case
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <RcicPickerDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        caseId={caseId}
        options={rcicOptions}
        currentId={rcicId}
      />

      {canDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={(o) => {
            if (!o) setDeleteError(null);
            setDeleteOpen(o);
          }}
          title="Delete this case?"
          description="This permanently removes the case and all its case-scoped history. The OneDrive folder is not removed. Soft-deletion (archive) is preferred for compliance. Are you sure you want a hard delete?"
          warningLines={[
            "Events, communications, participants, tasks, document metadata, and the retainer agreement are removed.",
            "OneDrive folder and uploaded files are NOT removed.",
            "Invoices or payments on this case will block the delete; void or reassign them first.",
            "The audit log captures the deletion event.",
          ]}
          expectedToken={caseNumber}
          tokenLabel="Type the case number to confirm"
          pending={pending}
          error={deleteError}
          onConfirm={runDelete}
          confirmLabel="Delete case"
        />
      )}
    </>
  );
}
