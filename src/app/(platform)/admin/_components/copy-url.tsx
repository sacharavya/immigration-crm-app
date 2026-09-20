"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A firm's public address, with a one-click copy for handing it over. */
export function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard permission; the address is on screen to copy by hand.
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[13px] text-[var(--primary)] hover:underline"
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
