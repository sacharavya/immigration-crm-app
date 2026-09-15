"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createTenant } from "../actions";

/** Derives a URL-safe handle so the operator rarely has to type one. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CreateTenantForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [prefix, setPrefix] = useState("BB");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTenant({
        name: name.trim(),
        slug: effectiveSlug,
        number_prefix: prefix.trim().toUpperCase(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      setSlug("");
      setSlugTouched(false);
      setPrefix("BB");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add a firm
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-stone-900">Add a firm</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-name">Firm name</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northern Star Immigration"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-prefix">Number prefix</Label>
            <Input
              id="t-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="NS"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-slug">Handle</Label>
          <Input
            id="t-slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="northern-star"
          />
          <p className="text-xs text-stone-500">
            Identifies the firm on its public pages. Case numbers will look
            like {(prefix || "BB").toUpperCase()}-2026-0001.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create firm"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
