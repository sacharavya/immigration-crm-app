// Browser-side chunked upload to a Microsoft Graph upload session. The
// session URL is pre-authenticated (minted by a staff-gated server action),
// so bytes flow directly browser-to-Microsoft; no auth headers, and the
// document never transits our server.

const CHUNK = 10 * 1024 * 1024; // 10 MiB, a multiple of Graph's 320 KiB unit

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
    last = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes ${sent}-${end - 1}/${total}`,
      },
      body: slice,
    });
    if (!last.ok) {
      throw new Error(`OneDrive upload failed (${last.status})`);
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
