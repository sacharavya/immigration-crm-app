"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllRead } from "../../_actions/notifications";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllRead();
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60"
    >
      <CheckCheck className="h-4 w-4" />
      Mark all read
    </button>
  );
}
