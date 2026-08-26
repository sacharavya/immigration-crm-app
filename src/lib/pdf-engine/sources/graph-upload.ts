// Browser-side chunked upload to a Microsoft Graph upload session. The
// session URL is pre-authenticated (minted by a staff-gated server action),
// so bytes flow directly browser-to-Microsoft; no auth headers, and the
// document never transits our server.

const CHUNK = 10 * 1024 * 1024; // 10 MiB, a multiple of Graph's 320 KiB unit

// Best-effort: tell Graph to drop an abandoned session so partial bytes are
// not held server-side. Failures are irrelevant (sessions also expire).
async function cancelSession(uploadUrl: string): Promise<void> {
  try {
    await fetch(uploadUrl, { method: "DELETE" });
  } catch {
    // expiry will clean it up
  }
}

export interface GraphUploadResult {
  webUrl: string | null;
  itemId: string | null;
}

export async function uploadToGraphSession(
  uploadUrl: string,
  bytes: Uint8Array,
  onProgress?: (sentBytes: number, totalBytes: number) => void,
): Promise<GraphUploadResult> {
  const total = bytes.byteLength;
  let sent = 0;
  let last: Response | null = null;

  while (sent < total) {
    const end = Math.min(sent + CHUNK, total);
    const slice = bytes.slice(sent, end);
    // Bounded retry per chunk: one transient 5xx must not abort a large
    // upload. 416 means Graph already has this range (an earlier attempt
    // landed after its response was lost) - treat as success and advance.
    let attempt = 0;
    for (;;) {
      try {
        last = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${sent}-${end - 1}/${total}`,
          },
          body: slice,
        });
      } catch (err) {
        last = null;
        if (attempt >= 2) {
          void cancelSession(uploadUrl);
          throw err instanceof Error ? err : new Error("upload failed");
        }
      }
      if (last?.ok || last?.status === 416) break;
      if (attempt >= 2) {
        void cancelSession(uploadUrl);
        throw new Error(`OneDrive upload failed (${last?.status ?? "network"})`);
      }
      attempt += 1;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
    sent = end;
    onProgress?.(sent, total);
  }

  // The final chunk's response carries the created drive item.
  try {
    const item = (await last?.json()) as
      | { webUrl?: string; id?: string }
      | undefined;
    return { webUrl: item?.webUrl ?? null, itemId: item?.id ?? null };
  } catch {
    return { webUrl: null, itemId: null };
  }
}
