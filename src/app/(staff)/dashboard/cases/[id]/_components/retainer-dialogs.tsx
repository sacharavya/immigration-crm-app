"use client";

import { Loader2, Upload as UploadIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  sendRetainerForSignature,
  uploadSignedRetainer,
  voidRetainer,
} from "../retainer-actions";

const ALLOWED_SCAN_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
];
const SCAN_MAX_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// SendForSignatureDialog
// ---------------------------------------------------------------------------

export function SendForSignatureDialog({
  open,
  onOpenChange,
  retainerId,
  defaultEmail,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  retainerId: string;
  defaultEmail: string;
  onSent: (signingPath: string) => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendRetainerForSignature({
        retainerId,
        recipient_email: email.trim(),
        send_email: false, // RET-6 will flip this on
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSent(result.signing_path);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send retainer for signature</DialogTitle>
          <DialogDescription>
            Generates a signing link that expires in 7 days. The client opens
            the link, reviews the agreement, and signs in their browser.
          </DialogDescription>
        </DialogHeader>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-stone-600">
            Recipient email
          </span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="mt-1"
          />
        </label>

        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Email delivery is not wired yet (RET-6). For now, copy the signing
          link from the next screen and send it via your usual channel.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={pending || !email.trim()}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Sending…
              </>
            ) : (
              "Send for signature"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// VoidRetainerDialog
// ---------------------------------------------------------------------------

export function VoidRetainerDialog({
  open,
  onOpenChange,
  retainerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  retainerId: string;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleVoid() {
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    startTransition(async () => {
      const result = await voidRetainer({
        retainerId,
        reason: reason.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this retainer?</DialogTitle>
          <DialogDescription>
            The retainer is archived and the case can&apos;t advance until a
            replacement is created. The void row is preserved in the audit log.
          </DialogDescription>
        </DialogHeader>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-stone-600">
            Reason (required)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-50"
            placeholder="e.g., Fee changed; client opted out; data entry error"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={pending || !reason.trim()}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Voiding…
              </>
            ) : (
              "Void retainer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// UploadSignedRetainerDialog
// ---------------------------------------------------------------------------

export function UploadSignedRetainerDialog({
  open,
  onOpenChange,
  retainerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  retainerId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED_SCAN_MIME.includes(f.type)) {
      setError("Use PDF, JPG, PNG, or HEIC.");
      setFile(null);
      return;
    }
    if (f.size > SCAN_MAX_BYTES) {
      setError("File must be under 10 MB.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  function handleUpload() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadSignedRetainer(retainerId, fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFile(null);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload signed retainer</DialogTitle>
          <DialogDescription>
            For paper signatures or external e-sign tools. The file is stored
            in the case&apos;s OneDrive folder under &ldquo;00 Retainer&rdquo;
            and the retainer flips to Uploaded.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_SCAN_MIME.join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
          >
            <UploadIcon className="mr-1 h-3.5 w-3.5" />
            Choose file
          </Button>
          {file && (
            <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          <p className="text-xs text-stone-500">
            Accepts PDF, JPG, PNG, HEIC. Max 10 MB.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={pending || !file}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
