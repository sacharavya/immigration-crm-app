"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/signature-pad";

import { setStaffSignature } from "../actions";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/heic"];

type Tab = "draw" | "upload";

export function SignatureForm({
  defaultPrintedName,
}: {
  defaultPrintedName: string;
}) {
  const [tab, setTab] = useState<Tab>("draw");
  const [printedName, setPrintedName] = useState(defaultPrintedName);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [drawnEmpty, setDrawnEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const padRef = useRef<SignaturePadHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File | null) {
    setError(null);
    if (!file) {
      setUploadedDataUrl(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Use PNG, JPEG, or HEIC.");
      setUploadedDataUrl(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File must be under 2 MB.");
      setUploadedDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setUploadedDataUrl(result);
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setError(null);
    if (!printedName.trim()) {
      setError("Printed name is required.");
      return;
    }

    let imageDataUrl: string;
    let method: "drawn" | "uploaded";

    if (tab === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) {
        setError("Draw your signature first.");
        return;
      }
      imageDataUrl = padRef.current.toDataUrl();
      method = "drawn";
    } else {
      if (!uploadedDataUrl) {
        setError("Upload an image first.");
        return;
      }
      imageDataUrl = uploadedDataUrl;
      method = "uploaded";
    }

    startTransition(async () => {
      const result = await setStaffSignature({
        method,
        imageDataUrl,
        printedName: printedName.trim(),
      });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "draw"
              ? "bg-[var(--navy)] text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Sign here
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "upload"
              ? "bg-[var(--navy)] text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Upload signature image
        </button>
      </div>

      {tab === "draw" ? (
        <SignaturePad
          ref={padRef}
          onChange={(empty) => setDrawnEmpty(empty)}
          disabled={pending}
        />
      ) : (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME.join(",")}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Choose file
            </Button>
            <span className="text-xs text-stone-500">
              PNG, JPEG, or HEIC, max 2 MB.
            </span>
          </div>
          {uploadedDataUrl && (
            <div className="inline-block rounded-md border border-stone-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedDataUrl}
                alt="Signature preview"
                style={{ width: 200, height: "auto" }}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Printed name
        </label>
        <Input
          value={printedName}
          onChange={(e) => setPrintedName(e.target.value)}
          maxLength={200}
          disabled={pending}
        />
        <p className="text-xs text-stone-500">
          Pre-filled from your profile. Edit to match the name on your RCIC
          credentials if different.
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

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={
            pending ||
            (tab === "draw" ? drawnEmpty : !uploadedDataUrl) ||
            !printedName.trim()
          }
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save signature"
          )}
        </Button>
      </div>
    </div>
  );
}
