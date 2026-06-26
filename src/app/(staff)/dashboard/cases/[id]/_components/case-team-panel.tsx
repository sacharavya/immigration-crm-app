import { AlertTriangle, Lock } from "lucide-react";

import { AddWorkerButton } from "./add-worker-button";
import { CaseTeamRowMenu } from "./case-team-row-menu";
import { SetRcicButton } from "./set-rcic-button";
import { TeamAvatar } from "./team-avatar";
import {
  formatStaffRole,
  staffName,
  type CaseTeam,
  type StaffOption,
} from "./team";

// Right rail "Case team" card. Server component: it reads the team and renders
// the rows. The only interactive pieces are the per row kebab menu and the
// pickers, which are their own client components. The group labels carry each
// person's role, so no inline role tag is rendered, which is what removes the
// old collision between the worker tag and its buttons.
//
// `canEdit` (manage permission) gates whether any controls render at all. The
// "at least one worker" rule is decided here (canRemove) and on the server, so
// the menu never recomputes it.
export function CaseTeamPanel({
  caseId,
  team,
  rcicOptions,
  workerOptions,
  canEdit,
}: {
  caseId: string;
  team: CaseTeam;
  rcicOptions: StaffOption[];
  workerOptions: StaffOption[];
  canEdit: boolean;
}) {
  const { rcic, workers, rcicInvalid } = team;
  const workerIds = workers.map((w) => w.id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Case team</h3>

      {/* RCIC of record */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          RCIC of record
          <Lock
            role="img"
            aria-label="Restricted to licensed RCICs"
            className="h-3 w-3 text-[var(--subtle-foreground)]"
          />
        </div>

        {rcicInvalid && (
          <p
            role="alert"
            className="flex items-start gap-1.5 rounded-md border border-border bg-muted px-2 py-1.5 text-[11px] text-muted-foreground"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This case&apos;s RCIC of record is no longer a licensed consultant.
            Assign a valid RCIC.
          </p>
        )}

        {rcic ? (
          <div className="flex items-start gap-3">
            <TeamAvatar member={rcic} variant="rcic" className="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p
                className="break-words text-sm font-medium text-foreground"
                title={staffName(rcic)}
              >
                {staffName(rcic)}
              </p>
              <p className="font-mono text-xs text-[var(--subtle-foreground)]">
                {rcic.rcic_membership_number ?? "License not on file"}
              </p>
            </div>
            {canEdit && (
              <CaseTeamRowMenu
                kind="rcic"
                caseId={caseId}
                options={rcicOptions}
                currentId={rcic.id}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canEdit ? (
              <SetRcicButton caseId={caseId} options={rcicOptions} />
            ) : (
              "No RCIC of record"
            )}
          </p>
        )}
      </section>

      <div className="h-px bg-border" />

      {/* Case workers */}
      <section className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Case workers
        </div>

        {workers.map((w) => (
          <div key={w.id} className="flex items-start gap-3">
            <TeamAvatar member={w} variant="worker" className="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p
                className="break-words text-sm font-medium text-foreground"
                title={staffName(w)}
              >
                {staffName(w)}
              </p>
              <p className="text-xs text-[var(--subtle-foreground)]">
                {formatStaffRole(w.role)}
              </p>
            </div>
            {canEdit && (
              <CaseTeamRowMenu
                kind="worker"
                caseId={caseId}
                member={{ id: w.id, name: staffName(w) }}
                options={workerOptions}
                excludeIds={workerIds}
                canRemove={workers.length > 1}
              />
            )}
          </div>
        ))}

        {canEdit && (
          <AddWorkerButton
            caseId={caseId}
            options={workerOptions}
            excludeIds={workerIds}
          />
        )}
      </section>
    </div>
  );
}
