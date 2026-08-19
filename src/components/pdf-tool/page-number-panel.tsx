"use client";

import { Input } from "@/components/ui/input";
import { INPUT_BASE_CLASS } from "@/components/ui/input-class";
import { Label } from "@/components/ui/label";
import type {
  Corner,
  PageNumberFormat,
  PageNumberOptions,
} from "@/lib/pdf-engine/types";

const POSITIONS: ReadonlyArray<{ value: Corner; label: string }> = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

const FORMATS: ReadonlyArray<{ value: PageNumberFormat; label: string }> = [
  { value: "n", label: "1" },
  { value: "n-of-total", label: "1 of 12" },
  { value: "page-n", label: "Page 1" },
  { value: "page-n-of-total", label: "Page 1 of 12" },
];

interface PageNumberPanelProps {
  value: PageNumberOptions;
  disabled: boolean;
  onChange: (next: PageNumberOptions) => void;
}

export function PageNumberPanel({
  value,
  disabled,
  onChange,
}: PageNumberPanelProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pn-position">Position</Label>
        <select
          id="pn-position"
          className={`${INPUT_BASE_CLASS} w-40`}
          value={value.position}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, position: e.target.value as Corner })
          }
        >
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pn-format">Format</Label>
        <select
          id="pn-format"
          className={`${INPUT_BASE_CLASS} w-36`}
          value={value.format}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, format: e.target.value as PageNumberFormat })
          }
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pn-start">Start at</Label>
        <Input
          id="pn-start"
          type="number"
          min={1}
          step={1}
          className="w-20"
          value={value.startAt}
          disabled={disabled}
          onChange={(e) => {
            const startAt = Number.parseInt(e.target.value, 10);
            onChange({
              ...value,
              startAt: Number.isFinite(startAt) && startAt >= 1 ? startAt : 1,
            });
          }}
        />
      </div>
    </div>
  );
}
