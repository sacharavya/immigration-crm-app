import * as React from "react";
import { Badge } from "bbi-temp";
import { Clock, CheckCircle2 } from "lucide-react";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge>Active</Badge>
    <Badge variant="secondary">Draft</Badge>
    <Badge variant="destructive">Overdue</Badge>
    <Badge variant="outline">Study Permit</Badge>
    <Badge variant="ghost">Archived</Badge>
    <Badge variant="link">View file</Badge>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="secondary"><Clock data-icon="inline-start" />Awaiting documents</Badge>
    <Badge><CheckCircle2 data-icon="inline-start" />Retainer signed</Badge>
  </div>
);

export const CaseStatusRow = () => (
  <div className="flex w-80 items-center justify-between rounded-lg border p-3 text-sm">
    <div>
      <div className="font-medium">Priya Raman</div>
      <div className="text-muted-foreground">Express Entry, CRS 487</div>
    </div>
    <Badge>ITA received</Badge>
  </div>
);
