"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { activateVersion, deprecateVersion } from "../actions";

// Draft versions can activate (the DB trigger enforces the stored-file and
// required-mapping gates and deprecates the previous active version).
// Active versions can be deprecated manually.
export function VersionActions({
  versionId,
  status,
}: {
  versionId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (id: string) => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(versionId);
      if ("error" in result) setError(result.error);
    });
  }

  if (status === "deprecated") return null;

  return (
    <span className="inline-flex items-center gap-2">
      {status === "draft" && (
        <Button
          size="sm"
          onClick={() => run(activateVersion)}
          disabled={pending}
        >
          {pending ? "Activating..." : "Activate"}
        </Button>
      )}
      {status === "active" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(deprecateVersion)}
          disabled={pending}
        >
          {pending ? "Working..." : "Deprecate"}
        </Button>
      )}
      {error && (
        <span role="alert" className="max-w-48 text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
