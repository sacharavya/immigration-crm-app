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
  activateBlockers = [],
}: {
  versionId: string;
  status: string;
  // Form field paths whose required mapping is unresolved; non-empty
  // disables Activate with an explanatory tooltip (the DB trigger is the
  // backstop for the same rule).
  activateBlockers?: string[];
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
        <span
          title={
            activateBlockers.length > 0
              ? `Resolve ${activateBlockers.length} required field mapping${activateBlockers.length === 1 ? "" : "s"} first: ${activateBlockers.slice(0, 3).join(", ")}${activateBlockers.length > 3 ? ", ..." : ""}`
              : undefined
          }
        >
          <Button
            size="sm"
            onClick={() => run(activateVersion)}
            disabled={pending || activateBlockers.length > 0}
          >
            {pending ? "Activating..." : "Activate"}
          </Button>
        </span>
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
