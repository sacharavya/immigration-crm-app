"use client";

import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { removeFirmLogo, uploadFirmLogo } from "../actions";

export function SiteSettingsForm({
  firmName,
  logoUrl,
}: {
  firmName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState(logoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function choose(file: File | undefined) {
    setError(null);
    setSaved(false);
    if (!file) return;
    // Show it immediately; the server still re-checks the actual bytes.
    setPreview(URL.createObjectURL(file));
  }

  function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("logo", file);
      const result = await uploadFirmLogo(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent(result.logoUrl);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await removeFirmLogo();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent(null);
      setPreview(null);
      router.refresh();
    });
  }

  const shown = preview ?? current;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Logo</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shown in your sidebar and on the pages your clients use to upload
            documents, pay and sign. Until you upload one, {firmName} uses the
            platform mark.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          {/* A chequerboard reveals transparent edges, which is the usual
              reason an uploaded logo looks wrong on a white sidebar. */}
          <div
            className="flex h-20 w-56 items-center justify-center rounded-lg border border-border p-3"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%)",
              backgroundSize: "16px 16px",
            }}
          >
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown}
                alt={`${firmName} logo`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">
                No logo yet
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-file" className="sr-only">
              Logo image
            </Label>
            <input
              ref={inputRef}
              id="logo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => choose(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPEG or WebP, up to 2MB. A wide transparent PNG works best.
            </p>
            <div className="flex gap-2">
              <Button onClick={upload} disabled={pending || !preview}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImageUp className="mr-1.5 h-4 w-4" />
                    Save logo
                  </>
                )}
              </Button>
              {current && (
                <Button variant="outline" onClick={remove} disabled={pending}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Logo updated. It appears across the app on the next page load.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
