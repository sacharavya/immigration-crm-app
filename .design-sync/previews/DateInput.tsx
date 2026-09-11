import * as React from "react";
import { DateInput, Label } from "bbi-temp";

export const Default = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="di-1">Passport expiry</Label>
    <DateInput id="di-1" defaultValue="2031-05-02" />
  </div>
);

export const Empty = () => (
  <div className="w-72"><DateInput name="entry_date" /></div>
);

export const Bounded = () => (
  <div className="flex w-72 flex-col gap-2">
    <Label htmlFor="di-3">Intended arrival (2026 only)</Label>
    <DateInput id="di-3" min="2026-01-01" max="2026-12-31" defaultValue="2026-11-15" />
  </div>
);

export const Disabled = () => (
  <div className="w-72"><DateInput defaultValue="2024-02-29" disabled /></div>
);
