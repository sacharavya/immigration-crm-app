"use client";

import { Check, Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/signature-pad";
import { Button } from "@/components/ui/button";

import {
  submitImageSignature,
  submitOnlineSignature,
  submitScannedDocument,
} from "../actions";

type Tab = "draw" | "upload-signature" | "upload-document";

const SIGNATURE_MIME = ["image/png", "image/jpeg", "image/jpg", "image/heic"];
const DOCUMENT_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

type Submission =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; downloadPath: string | null; method: Tab }
  | { state: "error"; message: string };

export function SigningForm({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
}) {
  const [tab, setTab] = useState<Tab>("draw");
  const [submission, setSubmission] = useState<Submission>({ state: "idle" });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureFilePreview, setSignatureFilePreview] = useState<
    string | null
  >(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [drawnEmpty, setDrawnEmpty] = useState(true);

  const padRef = useRef<SignaturePadHandle>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  if (submission.state === "success") {
    return <SuccessConfirmation submission={submission} />;
  }

  function pickSignatureFile(file: File | null) {
    if (!file) {
      setSignatureFile(null);
      setSignatureFilePreview(null);
      return;
    }
    if (!SIGNATURE_MIME.includes(file.type)) {
      setSubmission({
        state: "error",
        message: "Use PNG, JPEG, or HEIC.",
      });
      return;
    }
    if (file.size > SIGNATURE_MAX_BYTES) {
      setSubmission({
        state: "error",
        message: "Signature image must be under 2 MB.",
      });
      return;
    }
    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setSignatureFilePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function pickDocumentFile(file: File | null) {
    if (!file) {
      setDocumentFile(null);
      return;
    }
    if (!DOCUMENT_MIME.includes(file.type)) {
      setSubmission({
        state: "error",
        message: "Use PDF, JPG, PNG, DOC, or DOCX.",
      });
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setSubmission({
        state: "error",
        message: "Document must be under 10 MB.",
      });
      return;
    }
    setDocumentFile(file);
    setSubmission({ state: "idle" });
  }

  function handleSubmit() {
    setSubmission({ state: "submitting" });

    startTransition(async () => {
      try {
        if (tab === "draw") {
          if (!padRef.current || padRef.current.isEmpty()) {
            setSubmission({
              state: "error",
              message: "Please sign in the box above.",
            });
            return;
          }
          const dataUrl = padRef.current.toDataUrl();
          const result = await submitOnlineSignature({
            token,
            signatureDataUrl: dataUrl,
          });
          if ("error" in result) {
            setSubmission({ state: "error", message: result.error });
            return;
          }
          setSubmission({
            state: "success",
            downloadPath: result.download_path,
            method: "draw",
          });
        } else if (tab === "upload-signature") {
          if (!signatureFile) {
            setSubmission({
              state: "error",
              message: "Choose a signature image first.",
            });
            return;
          }
          const fd = new FormData();
          fd.set("file", signatureFile);
          const result = await submitImageSignature(token, fd);
          if ("error" in result) {
            setSubmission({ state: "error", message: result.error });
            return;
          }
          setSubmission({
            state: "success",
            downloadPath: result.download_path,
            method: "upload-signature",
          });
        } else {
          if (!documentFile) {
            setSubmission({
              state: "error",
              message: "Choose a signed document first.",
            });
            return;
          }
          const fd = new FormData();
          fd.set("file", documentFile);
          const result = await submitScannedDocument(token, fd);
          if ("error" in result) {
            setSubmission({ state: "error", message: result.error });
            return;
          }
          setSubmission({
            state: "success",
            downloadPath: result.download_path,
            method: "upload-document",
          });
        }
      } catch (err) {
        setSubmission({
          state: "error",
          message:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        });
      }
    });
  }

  const submitDisabled =
    pending ||
    (tab === "draw" && drawnEmpty) ||
    (tab === "upload-signature" && !signatureFile) ||
    (tab === "upload-document" && !documentFile);

  const submitLabel =
    tab === "upload-document" ? "Submit signed document" : "Sign and submit";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
        <TabButton
          active={tab === "draw"}
          onClick={() => setTab("draw")}
          label="Sign here"
        />
        <TabButton
          active={tab === "upload-signature"}
          onClick={() => setTab("upload-signature")}
          label="Upload signature image"
        />
        <TabButton
          active={tab === "upload-document"}
          onClick={() => setTab("upload-document")}
          label="Upload signed document"
        />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        {tab === "draw" && (
          <div className="space-y-2">
            <SignaturePad
              ref={padRef}
              onChange={(empty) => setDrawnEmpty(empty)}
              disabled={pending}
            />
            <p className="text-xs text-stone-500">
              Use your finger or mouse to sign in the box above.
            </p>
          </div>
        )}

        {tab === "upload-signature" && (
          <div className="space-y-3">
            <input
              ref={sigInputRef}
              type="file"
              accept={SIGNATURE_MIME.join(",")}
              onChange={(e) => pickSignatureFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sigInputRef.current?.click()}
              disabled={pending}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Choose image
            </Button>
            <p className="text-xs text-stone-500">
              Upload a photo of your signature. PNG, JPEG, or HEIC up to 2 MB.
            </p>
            {signatureFilePreview && (
              <div className="inline-block rounded-md border border-stone-200 bg-stone-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signatureFilePreview}
                  alt="Signature preview"
                  style={{ width: 200, height: "auto" }}
                />
              </div>
            )}
          </div>
        )}

        {tab === "upload-document" && (
          <div className="space-y-3">
            <input
              ref={docInputRef}
              type="file"
              accept={DOCUMENT_MIME.join(",")}
              onChange={(e) => pickDocumentFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => docInputRef.current?.click()}
              disabled={pending}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Choose file
            </Button>
            <p className="text-xs text-stone-500">
              If you&apos;ve already printed and signed the agreement, upload
              the scanned copy here. The full document replaces the digital
              version. PDF, image, or Word file up to 10 MB.
            </p>
            {documentFile && (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                {documentFile.name} · {(documentFile.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        )}
      </div>

      {submission.state === "error" && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {submission.message}
        </p>
      )}

      <div className="text-xs text-stone-500">
        Signing as{" "}
        <span className="font-medium text-stone-700">{clientName}</span>. Your
        signature, IP address, and time of signing will be recorded as part
        of the agreement&apos;s audit trail.
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitDisabled}
        className="w-full sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Submitting…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors min-w-[40%] sm:min-w-0 ${
        active
          ? "bg-[var(--navy)] text-white"
          : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {label}
    </button>
  );
}

function SuccessConfirmation({
  submission,
}: {
  submission: Extract<Submission, { state: "success" }>;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-6 w-6" />
      </div>
      <h2 className="mt-3 text-xl font-semibold text-emerald-900">
        Signed
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-emerald-900/80">
        Your retainer agreement has been received and is now in effect. Big
        Bang Immigration will be in touch with the next steps.
      </p>
      {submission.downloadPath ? (
        <div className="mt-5">
          <a
            href={submission.downloadPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-[var(--navy)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Download signed copy
          </a>
        </div>
      ) : (
        <p className="mt-3 text-xs text-emerald-900/70">
          We&apos;ll email you a copy shortly.
        </p>
      )}
    </div>
  );
}
