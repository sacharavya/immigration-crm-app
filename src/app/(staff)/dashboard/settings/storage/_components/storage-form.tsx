"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StorageProvider } from "@/lib/storage/resolve";

import { updateStorageSettings, type StorageSettingsInput } from "../actions";

const PROVIDERS: {
  value: StorageProvider;
  label: string;
  blurb: string;
  available: boolean;
}[] = [
  {
    value: "onedrive",
    label: "Microsoft OneDrive / SharePoint",
    blurb:
      "Case folders, uploads, and generated PDFs live in your Microsoft 365 document library.",
    available: true,
  },
  {
    value: "google_drive",
    label: "Google Drive",
    blurb:
      "Use Connect Google Workspace above. This fallback library is OneDrive only.",
    available: false,
  },
];

export type StorageFormProps = {
  /** True when GRAPH_DOCUMENT_LIBRARY_ID is set on this deployment. */
  hasEnvFallback: boolean;
  /** Resolved id actually in use, whether it came from the row or env. */
  effectiveDriveId: string | null;
  initial: {
    provider: StorageProvider;
    drive_id: string | null;
    root_folder: string;
  };
};

export function StorageForm({
  hasEnvFallback,
  effectiveDriveId,
  initial,
}: StorageFormProps) {
  const [provider, setProvider] = useState<StorageProvider>(initial.provider);
  const [driveId, setDriveId] = useState(initial.drive_id ?? "");
  const [rootFolder, setRootFolder] = useState(initial.root_folder);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit() {
    setError(null);
    setSuccess(false);

    const payload: StorageSettingsInput = {
      provider,
      drive_id: driveId.trim() || null,
      root_folder: rootFolder.trim(),
    };

    startTransition(async () => {
      const result = await updateStorageSettings(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <div className="space-y-5">
      <Section
        title="Platform library (fallback)"
        description="Used only while no account is connected above. Set by whoever runs the platform."
      >
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                provider === p.value
                  ? "border-[var(--primary)] bg-[var(--accent)]"
                  : "border-stone-200 hover:border-stone-300",
                p.available ? "" : "cursor-not-allowed opacity-60",
              ].join(" ")}
            >
              <input
                type="radio"
                name="provider"
                className="mt-1"
                value={p.value}
                checked={provider === p.value}
                disabled={!p.available}
                onChange={() => setProvider(p.value)}
              />
              <span>
                <span className="block text-sm font-medium text-stone-900">
                  {p.label}
                  {!p.available && (
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-normal text-stone-600">
                      Connect above
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {p.blurb}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section
        title="Location"
        description="Which library inside the provider, and the folder the case tree is anchored under."
      >
        <div className="space-y-1.5">
          <Label htmlFor="drive_id">Document library id</Label>
          <Input
            id="drive_id"
            value={driveId}
            onChange={(e) => setDriveId(e.target.value)}
            placeholder={
              hasEnvFallback
                ? "Leave blank to use GRAPH_DOCUMENT_LIBRARY_ID"
                : "b!aBcD… (from npm run graph:test)"
            }
          />
          <p className="text-xs text-stone-500">
            {effectiveDriveId
              ? `Currently writing to ${effectiveDriveId}.`
              : "No library configured — uploads will fail until one is set."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="root_folder">Root folder</Label>
          <Input
            id="root_folder"
            value={rootFolder}
            onChange={(e) => setRootFolder(e.target.value)}
            placeholder="Leave blank to anchor at the drive root"
          />
          <p className="text-xs text-stone-500">
            Optional prefix for every case folder, useful for sandboxing a test
            firm. Slashes nest, for example Sandbox/Cases.
          </p>
        </div>

        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Changing these redirects where new folders and uploads go. Files
          already stored keep pointing at their original location and stay
          readable — nothing is moved or copied.
        </p>
      </Section>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Storage settings saved.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-stone-500">{description}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
