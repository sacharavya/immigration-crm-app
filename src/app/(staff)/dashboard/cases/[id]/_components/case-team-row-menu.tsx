"use client";

import { Menu } from "@base-ui/react/menu";
import { MoreVertical, Trash2, UserCog } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/index";

import { RcicPickerDialog } from "./rcic-picker-dialog";
import { RemoveWorkerDialog } from "./remove-worker-dialog";
import type { StaffOption } from "./team";
import { WorkerPickerDialog } from "./worker-picker-dialog";

const triggerClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const itemClass =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--subtle-foreground)] data-[disabled]:data-[highlighted]:bg-transparent";

const popupClass =
  "min-w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none";

type RcicMenu = {
  kind: "rcic";
  caseId: string;
  options: StaffOption[];
  currentId: string | null;
};

type WorkerMenu = {
  kind: "worker";
  caseId: string;
  member: { id: string; name: string };
  options: StaffOption[];
  excludeIds: string[];
  canRemove: boolean;
};

export type CaseTeamRowMenuProps = RcicMenu | WorkerMenu;

export function CaseTeamRowMenu(props: CaseTeamRowMenuProps) {
  // One dialog open at a time per row. `null` = closed.
  const [dialog, setDialog] = useState<"change" | "remove" | null>(null);

  const label = props.kind === "rcic" ? "RCIC actions" : "Worker actions";

  return (
    <>
      <Menu.Root>
        <Menu.Trigger aria-label={label} className={triggerClass}>
          <MoreVertical className="h-4 w-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50">
            <Menu.Popup className={popupClass}>
              {props.kind === "rcic" ? (
                <Menu.Item
                  className={itemClass}
                  onClick={() => setDialog("change")}
                >
                  <UserCog className="h-4 w-4" />
                  Change RCIC of record
                </Menu.Item>
              ) : (
                <>
                  <Menu.Item
                    className={itemClass}
                    onClick={() => setDialog("change")}
                  >
                    <UserCog className="h-4 w-4" />
                    Change person
                  </Menu.Item>
                  <Menu.Item
                    className={cn(
                      itemClass,
                      props.canRemove && "text-[var(--destructive)]",
                    )}
                    disabled={!props.canRemove}
                    onClick={() => {
                      if (props.canRemove) setDialog("remove");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from case
                  </Menu.Item>
                  {!props.canRemove && (
                    <p className="px-2 pb-1 pt-0.5 text-[11px] text-[var(--subtle-foreground)]">
                      A case needs at least one worker.
                    </p>
                  )}
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {props.kind === "rcic" ? (
        <RcicPickerDialog
          open={dialog === "change"}
          onOpenChange={(o) => setDialog(o ? "change" : null)}
          caseId={props.caseId}
          options={props.options}
          currentId={props.currentId}
        />
      ) : (
        <>
          <WorkerPickerDialog
            open={dialog === "change"}
            onOpenChange={(o) => setDialog(o ? "change" : null)}
            caseId={props.caseId}
            options={props.options}
            excludeIds={props.excludeIds}
            replacing={{ id: props.member.id, name: props.member.name }}
          />
          <RemoveWorkerDialog
            open={dialog === "remove"}
            onOpenChange={(o) => setDialog(o ? "remove" : null)}
            caseId={props.caseId}
            worker={props.member}
          />
        </>
      )}
    </>
  );
}
