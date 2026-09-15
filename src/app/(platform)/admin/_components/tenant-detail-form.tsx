"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isFeatureEnabled,
  type FeatureCatalogueEntry,
} from "@/lib/tenant/features";

import { setTenantFeatures, updateTenant } from "../actions";

export type TenantDetailFormProps = {
  catalogue: FeatureCatalogueEntry[];
  tenant: {
    id: string;
    name: string;
    slug: string;
    number_prefix: string;
    status: "active" | "suspended";
    public_host: string | null;
    features: Record<string, unknown>;
    admin_notes: string;
  };
};

export function TenantDetailForm({
  catalogue,
  tenant,
}: TenantDetailFormProps) {
  const router = useRouter();

  const [name, setName] = useState(tenant.name);
  const [prefix, setPrefix] = useState(tenant.number_prefix);
  const [status, setStatus] = useState(tenant.status);
  const [host, setHost] = useState(tenant.public_host ?? "");
  const [notes, setNotes] = useState(tenant.admin_notes);

  // Start from the resolved state so a switch shows what is actually in
  // effect, not just what happens to be overridden.
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const f of catalogue) {
      out[f.key] = isFeatureEnabled(f.key, tenant.features, catalogue);
    }
    return out;
  });

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function saveDetails() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await updateTenant({
        id: tenant.id,
        name: name.trim(),
        number_prefix: prefix.trim().toUpperCase(),
        status,
        public_host: host.trim() || null,
        admin_notes: notes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved("Firm details saved.");
      router.refresh();
    });
  }

  function saveFeatures(next: Record<string, boolean>) {
    setError(null);
    setSaved(null);
    setFeatures(next);
    startTransition(async () => {
      const result = await setTenantFeatures({ id: tenant.id, features: next });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved("Features updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-stone-900">Firm details</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-name">Name</Label>
              <Input
                id="d-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-prefix">Number prefix</Label>
              <Input
                id="d-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-host">Public domain</Label>
            <Input
              id="d-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={`Leave blank to use ${tenant.slug} as a subdomain`}
            />
            <p className="text-xs text-stone-500">
              Where this firm&apos;s booking and contact pages are served. Used
              to tell requests apart when several firms share the platform.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-status">Status</Label>
            <select
              id="d-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "suspended")
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <p className="text-xs text-stone-500">
              Suspending stops this firm&apos;s public pages from resolving. It
              does not delete or hide anything for their staff.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-notes">Internal notes</Label>
            <textarea
              id="d-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
              placeholder="Billing arrangement, onboarding state, anything worth remembering."
            />
            <p className="text-xs text-stone-500">
              Only visible here. The firm never sees this.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveDetails} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save details"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Features</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Switch modules on or off for this firm. Changes take effect on
              their next page load.
            </p>
          </div>

          <div className="space-y-2">
            {catalogue.map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 hover:border-stone-300"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={features[f.key] ?? f.default_enabled}
                  disabled={pending}
                  onChange={(e) =>
                    saveFeatures({ ...features, [f.key]: e.target.checked })
                  }
                />
                <span>
                  <span className="block text-sm font-medium text-stone-900">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {f.description}
                  </span>
                </span>
              </label>
            ))}
            {catalogue.length === 0 && (
              <p className="text-sm text-stone-500">
                No features defined yet. Add them under Features.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {saved}
        </p>
      )}
    </div>
  );
}
