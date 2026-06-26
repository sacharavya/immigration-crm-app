"use client";

import { Menu } from "@base-ui/react/menu";
import {
  Check,
  Link2,
  Merge,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteConfirmDialog } from "@/components/checklists/delete-confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteClient } from "../../actions";

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:text-[var(--subtle-foreground)] data-[disabled]:data-[highlighted]:bg-transparent";

// Secondary client actions. Mirrors the case overflow menu: the everyday
// actions sit at the top, and the destructive Delete client is separated at
// the bottom, shown only to a super_user and confirmed behind a typed token.
export function ClientOverflowMenu({
  clientId,
  clientName,
  clientNumber,
  canDelete,
}: {
  clientId: string;
  clientName: string;
  clientNumber: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

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
      const result = await deleteClient(clientId);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      router.push("/dashboard/clients");
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
                Edit client details
              </Menu.Item>
              <Menu.Item className={itemClass} disabled title="Coming soon">
                <Merge className="h-4 w-4" />
                Merge client
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--success-text)]" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copied ? "Link copied" : "Copy link to client"}
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
                    Delete client
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {canDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={(o) => {
            if (!o) setDeleteError(null);
            setDeleteOpen(o);
          }}
          title="Delete this client?"
          description="This permanently removes the client record. Any cases that reference this client must be removed first."
          warningLines={[
            "Intake history (family, education, employment, travel, addresses) is removed via cascade.",
            "Communications and audit-log entries about this client are NOT removed.",
            "There is no soft-delete fallback. Deletion is final.",
          ]}
          expectedToken={clientNumber}
          tokenLabel="Type the client number to confirm"
          pending={pending}
          error={deleteError}
          onConfirm={runDelete}
          confirmLabel={`Delete ${clientName}`}
        />
      )}
    </>
  );
}
