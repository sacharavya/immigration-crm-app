"use client";

import type { SegmentCounts, WorklistRow } from "@/lib/clients/worklist";

import type { WorklistParams } from "./build-href";
import { SegmentTabs } from "./segment-tabs";
import { WorklistTable } from "./worklist-table";
import { WorklistToolbar } from "./worklist-toolbar";

type Option = { id: string; name: string };
type CitOption = { code: string; name: string };

type Props = {
  rows: WorklistRow[];
  counts: SegmentCounts;
  params: WorklistParams;
  staffById: Record<string, string>;
  agentById: Record<string, string>;
  ownerOptions: Option[];
  serviceTypeOptions: Option[];
  citizenshipOptions: CitOption[];
};

export function WorklistShell({
  rows,
  counts,
  params,
  staffById,
  agentById,
  ownerOptions,
  serviceTypeOptions,
  citizenshipOptions,
}: Props) {
  return (
    <div className="space-y-3">
      <SegmentTabs counts={counts} params={params} />

      <WorklistToolbar
        params={params}
        ownerOptions={ownerOptions}
        serviceTypeOptions={serviceTypeOptions}
        citizenshipOptions={citizenshipOptions}
      />

      <WorklistTable rows={rows} staffById={staffById} agentById={agentById} />

      <p className="text-xs text-stone-400">
        {rows.length} client{rows.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
