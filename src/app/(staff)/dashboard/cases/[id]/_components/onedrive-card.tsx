"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { retryFolderCreation } from "../../new/actions";

const POLL_MS = 2000;
// Cap auto-polling so a stuck job eventually surfaces the retry UI.
const POLL_TIMEOUT_MS = 30_000;

export function OneDriveCard({
  caseId,
  folderId,
  folderUrl,
  provisioning,
}: {
  caseId: string;
  folderId: string | null;
  folderUrl: string | null;
  provisioning: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pollExpired, setPollExpired] = useState(false);

  // Auto-poll while the background after() job is still in flight. Each
  // tick refetches the page; the server returns the new folder state and
  // OneDriveCard renders accordingly. Stops at POLL_TIMEOUT_MS so a
  // wedged job eventually drops to the manual retry UI.
  useEffect(() => {
    if (!provisioning || folderId) return;
    const tick = setInterval(() => router.refresh(), POLL_MS);
    const stop = setTimeout(() => setPollExpired(true), POLL_TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [provisioning, folderId, router]);

  function handleRetry() {
    setError(null);
    setPollExpired(false);
    startTransition(async () => {
      const result = await retryFolderCreation(caseId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (folderUrl && folderId) {
    return (
      <Link
        href={folderUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonVariants({ variant: "outline", size: "sm" })} w-full justify-center`}
      >
        <ExternalLink className="mr-1 h-3.5 w-3.5" />
        Open folder
      </Link>
    );
  }

  if (provisioning && !pollExpired) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Creating folder…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">
        {pollExpired
          ? "Folder is taking longer than expected."
          : "Folder not yet created."}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleRetry}
        disabled={pending}
      >
        {pending ? "Retrying…" : "Retry folder creation"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
