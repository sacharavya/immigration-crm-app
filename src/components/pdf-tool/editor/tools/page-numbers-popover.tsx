"use client";

// Page numbers tool: stores PageNumberOptions in the editor store; they are
// applied at export build time. Reuses the existing PageNumberPanel UI.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PageNumberOptions } from "@/lib/pdf-engine/types";

import { PageNumberPanel } from "../../page-number-panel";
import { useEditor } from "../editor-store";

const DEFAULT_PAGE_NUMBERS: PageNumberOptions = {
  format: "n-of-total",
  position: "bottom-center",
  startAt: 1,
  fontSize: 9,
  marginPt: 24,
};

export function PageNumbersPopover({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, dispatch } = useEditor();
  const enabled = state.pageNumbers !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Page numbers</DialogTitle>
          <DialogDescription>
            Stamped onto every page when the package is exported.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm font-medium select-none">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={enabled}
            onChange={(e) =>
              dispatch({
                type: "pageNumbers/set",
                options: e.target.checked ? DEFAULT_PAGE_NUMBERS : null,
              })
            }
          />
          Add page numbers at export
        </label>

        {state.pageNumbers && (
          <PageNumberPanel
            value={state.pageNumbers}
            disabled={false}
            onChange={(options) =>
              dispatch({ type: "pageNumbers/set", options })
            }
          />
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
