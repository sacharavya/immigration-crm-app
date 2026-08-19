"use client";

import { HammerIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INPUT_BASE_CLASS } from "@/components/ui/input-class";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { PageNumberOptions } from "@/lib/pdf-engine/types";

import { PageNumberPanel } from "./page-number-panel";
import { SIZE_PRESETS } from "./presets";

interface ToolbarProps {
  presetKey: string;
  onPresetChange: (key: string) => void;
  customMb: number;
  onCustomMbChange: (mb: number) => void;
  pageNumbersEnabled: boolean;
  onPageNumbersEnabledChange: (enabled: boolean) => void;
  pageNumberOptions: PageNumberOptions;
  onPageNumberOptionsChange: (next: PageNumberOptions) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  canBuild: boolean;
  disabled: boolean;
  onBuild: () => void;
}

export function Toolbar({
  presetKey,
  onPresetChange,
  customMb,
  onCustomMbChange,
  pageNumbersEnabled,
  onPageNumbersEnabledChange,
  pageNumberOptions,
  onPageNumberOptionsChange,
  fileName,
  onFileNameChange,
  canBuild,
  disabled,
  onBuild,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="size-preset">Size limit</Label>
          <select
            id="size-preset"
            className={`${INPUT_BASE_CLASS} w-52`}
            value={presetKey}
            disabled={disabled}
            onChange={(e) => onPresetChange(e.target.value)}
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {presetKey === "custom" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-mb">Limit (MB)</Label>
            <Input
              id="custom-mb"
              type="number"
              min={1}
              step={1}
              className="w-24"
              value={customMb}
              disabled={disabled}
              onChange={(e) => {
                const mb = Number(e.target.value);
                onCustomMbChange(Number.isFinite(mb) && mb > 0 ? mb : 0);
              }}
            />
          </div>
        )}

        <Separator orientation="vertical" className="hidden h-8 sm:block" />

        <label className="flex h-8 items-center gap-2 text-sm font-medium select-none">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={pageNumbersEnabled}
            disabled={disabled}
            onChange={(e) => onPageNumbersEnabledChange(e.target.checked)}
          />
          Page numbers
        </label>

        <Separator orientation="vertical" className="hidden h-8 sm:block" />

        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor="file-name">File name</Label>
          <Input
            id="file-name"
            value={fileName}
            disabled={disabled}
            onChange={(e) => onFileNameChange(e.target.value)}
          />
        </div>

        <Button onClick={onBuild} disabled={!canBuild || disabled}>
          <HammerIcon data-icon="inline-start" />
          Build package
        </Button>
      </div>

      {pageNumbersEnabled && (
        <PageNumberPanel
          value={pageNumberOptions}
          disabled={disabled}
          onChange={onPageNumberOptionsChange}
        />
      )}
    </div>
  );
}
