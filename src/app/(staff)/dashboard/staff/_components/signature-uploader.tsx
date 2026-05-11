"use client";

import { format } from "date-fns";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { removeStaffSignature, setStaffSignature } from "../actions";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/heic"];

type Props = {
  staffId: string;
  defaultPrintedName: string;
  current: {
    imageUrl: string | null;
    setAt: string | null;
    printedName: string | null;
  };
};

export function SignatureUploader({
  staffId,
  defaultPrintedName,
  current,
}: Props) {
  const [imageUrl, setImageUrl] = useState(current.imageUrl);
  const [setAt, setSetAt] = useState(current.setAt);
  const [printedName, setPrintedName] = useState(
    current.printedName ?? defaultPrintedName,
  );
  const [pickedDataUrl, setPickedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const hasSignature = Boolean(imageUrl);

  function pickFile(file: File | null) {
    setError(null);
    if (!file) {
      setPickedDataUrl(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Use PNG, JPEG, or HEIC.");
      setPickedDataUrl(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File must be under 2 MB.");
      setPickedDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setPickedDataUrl(result);
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setError(null);
    if (!pickedDataUrl) {
      setError("Choose a file first.");
      return;
    }
    if (!printedName.trim()) {
      setError("Printed name is required.");
      return;
    }
    startTransition(async () => {
      const result = await setStaffSignature(staffId, {
        imageDataUrl: pickedDataUrl,
        printedName: printedName.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setImageUrl(pickedDataUrl);
      setSetAt(new Date().toISOString());
      setPickedDataUrl(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleRemove() {
    setError(null);
    startRemoveTransition(async () => {
      const result = await removeStaffSignature(staffId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setImageUrl(null);
      setSetAt(null);
      setPickedDataUrl(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        Signature on file
      </div>

      {hasSignature && imageUrl ? (
        <div className="flex items-start gap-4">
          <div className="rounded-md border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Signature on file"
              style={{ width: 180, height: "auto" }}
            />
          </div>
          <div className="space-y-1 text-xs text-stone-600">
            {setAt && (
              <div>
                <span className="text-stone-500">Set on </span>
                <span className="font-medium text-stone-800">
                  {format(new Date(setAt), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {current.printedName && (
              <div>
                <span className="text-stone-500">Printed name </span>
                <span className="font-medium text-stone-800">
                  {current.printedName}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removePending || pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {removePending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Remove signature
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-600">
          No signature on file yet. Upload a signature image (PNG, JPEG, or
          HEIC) to use on retainer agreements.
        </p>
      )}

      <div className="space-y-2 border-t border-stone-200 pt-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {hasSignature ? "Replace signature" : "Upload signature"}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={pending || removePending}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Choose file
          </Button>
          <span className="text-xs text-stone-500">Max 2 MB.</span>
        </div>

        {pickedDataUrl && (
          <div className="inline-block rounded-md border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pickedDataUrl}
              alt="Signature preview"
              style={{ width: 180, height: "auto" }}
            />
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
            disabled={pending || removePending}
          />
          <p className="text-xs text-stone-500">
            Pre-filled from the staff name. Edit to match what should appear
            beneath the signature.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={
            pending || removePending || !pickedDataUrl || !printedName.trim()
          }
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : hasSignature ? (
            "Save replacement"
          ) : (
            "Save signature"
          )}
        </Button>
      </div>
    </div>
  );
}
