"use client";

import {
  Archive,
  ArchiveRestore,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  archiveAppointmentType,
  deleteAppointmentType,
  duplicateAppointmentType,
  unarchiveAppointmentType,
} from "../actions";

import { TypeFormDialog, type TypeFormInput } from "./type-form-dialog";

export type TypeRow = {
  id: string;
  name: string;
  code: string;
  duration_minutes: number;
  default_location_type: "online" | "onsite";
  description: string;
  preparation_notes: string | null;
  is_public: boolean;
  requires_case: boolean;
  fee_cad: number | null;
  display_order: number;
  active: boolean;
  deleted_at: string | null;
};

function formatFee(fee: number | null): string {
  if (fee === null || fee === 0) return "Free";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(fee);
}

function toFormInput(row: TypeRow): TypeFormInput {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    duration_minutes: row.duration_minutes,
    default_location_type: row.default_location_type,
    description: row.description,
    preparation_notes: row.preparation_notes,
    is_public: row.is_public,
    requires_case: row.requires_case,
    fee_cad: row.fee_cad,
    display_order: row.display_order,
  };
}

export function TypesPageClient({
  activeTypes,
  archivedTypes,
  canDelete,
}: {
  activeTypes: TypeRow[];
  archivedTypes: TypeRow[];
  canDelete: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TypeFormInput | undefined>(undefined);
  const [showArchived, setShowArchived] = useState(false);

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(row: TypeRow) {
    setEditing(toFormInput(row));
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            Appointment types
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Types control what prospects see on the public booking page and
            what staff can pick when scheduling meetings.
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> New type
        </Button>
      </div>

      {activeTypes.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone-200 bg-stone-50 px-6 py-12 text-center text-sm text-stone-500">
          No active types. Create one to start scheduling appointments.
        </p>
      ) : (
        <ul className="space-y-3">
          {activeTypes.map((row) => (
            <TypeCard
              key={row.id}
              row={row}
              canDelete={canDelete}
              onEdit={() => openEdit(row)}
            />
          ))}
        </ul>
      )}

      {archivedTypes.length > 0 && (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-700"
          >
            Archived ({archivedTypes.length}) {showArchived ? "▾" : "▸"}
          </button>
          {showArchived && (
            <ul className="mt-3 space-y-3">
              {archivedTypes.map((row) => (
                <TypeCard
                  key={row.id}
                  row={row}
                  canDelete={canDelete}
                  onEdit={() => openEdit(row)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <TypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </div>
  );
}

function TypeCard({
  row,
  canDelete,
  onEdit,
}: {
  row: TypeRow;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(
    promise: Promise<{ ok: true } | { ok?: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const r = await promise;
      if ("error" in r) setError(r.error);
    });
  }

  return (
    <li>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-stone-900">
                  {row.name}
                </h2>
                {!row.active && (
                  <Badge className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                    Archived
                  </Badge>
                )}
                {row.is_public ? (
                  <Badge className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                    Public
                  </Badge>
                ) : (
                  <Badge className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                    Internal
                  </Badge>
                )}
                {row.requires_case && (
                  <Badge className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Requires case
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                {row.duration_minutes} min · {row.default_location_type === "online" ? "Online" : "Onsite"} by default · {formatFee(row.fee_cad)} · code <code className="font-mono text-[11px] text-stone-600">{row.code}</code>
              </p>
              <p className="mt-2 text-sm text-stone-700">{row.description}</p>
              {row.preparation_notes && (
                <p className="mt-1 text-xs text-stone-500">
                  &ldquo;What to expect&rdquo; configured
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={pending}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(duplicateAppointmentType(row.id))}
              disabled={pending}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
            </Button>
            {row.active ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(archiveAppointmentType(row.id))}
                disabled={pending}
              >
                <Archive className="mr-1 h-3.5 w-3.5" /> Archive
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(unarchiveAppointmentType(row.id))}
                disabled={pending}
              >
                <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> Unarchive
              </Button>
            )}
            {canDelete &&
              (confirmDelete ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => run(deleteAppointmentType(row.id))}
                    disabled={pending}
                  >
                    Confirm delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                  disabled={pending}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              ))}
          </div>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
