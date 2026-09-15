"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  deleteTenant,
  previewTenantDeletion,
  type DeletePreviewRow,
} from "../actions";

const LABELS: Record<string, string> = {
  "crm.clients": "clients",
  "crm.cases": "cases",
  "crm.staff": "staff accounts",
  "files.documents": "documents",
  "crm.payments": "payments",
  "crm.invoices": "invoices",
  "crm.appointments": "appointments",
  "crm.tasks": "tasks",
  "crm.communications": "emails logged",
  "crm.retainer_agreements": "retainers",
  "audit.change_log": "audit records",
};

export function DangerZone({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [rows, setRows] = useState<DeletePreviewRow[] | null>(null);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openPanel() {
    setOpen(true);
    setError(null);
    startTransition(async () => {
      const result = await previewTenantDeletion(tenantId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows(result.rows);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTenant({
        tenant_id: tenantId,
        confirm_name: confirm,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  const total = (rows ?? []).reduce((n, r) => n + Number(r.row_count), 0);
  const matches = confirm.trim() === tenantName;

  return (
    <Card className="border-rose-200">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-2">
          <AlertTriangle
            aria-hidden
            className="mt-0.5 h-4 w-4 flex-none text-rose-600"
          />
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Remove firm</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Permanently deletes {tenantName} and everything it owns, including
              every client record, case, document and sign-in account. This
              cannot be undone. Suspending the firm instead keeps their data and
              is reversible.
            </p>
          </div>
        </div>

        {!open ? (
          <Button variant="outline" onClick={openPanel} disabled={pending}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove this firm
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
            {pending && rows === null ? (
              <p className="flex items-center gap-2 text-sm text-rose-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Counting what would be destroyed…
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-rose-900">
                  {total === 0
                    ? "This firm holds no records. Only the firm itself will be removed."
                    : `${total.toLocaleString()} records will be permanently destroyed:`}
                </p>
                {total > 0 && (
                  <ul className="grid gap-x-6 gap-y-0.5 text-xs text-rose-800 sm:grid-cols-2">
                    {(rows ?? [])
                      .slice()
                      .sort((a, b) => Number(b.row_count) - Number(a.row_count))
                      .map((r) => (
                        <li key={r.table_ref} className="flex justify-between">
                          <span>{LABELS[r.table_ref] ?? r.table_ref}</span>
                          <span className="tabular-nums">{r.row_count}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="confirm-name" className="text-rose-900">
                Type <span className="font-semibold">{tenantName}</span> to
                confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                className="bg-white"
              />
            </div>

            {error && (
              <p className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setRows(null);
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                onClick={remove}
                disabled={pending || !matches}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Removing…
                  </>
                ) : (
                  "Permanently remove"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
