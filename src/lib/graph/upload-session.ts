export type UploadedDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  file?: { mimeType?: string };
};

/**
 * PUTs a whole file into a Graph upload session. The session URL is
 * pre-authorised — Graph rejects an Authorization header on it — so this is
 * a plain fetch. Sessions accept up to 60 MiB per chunk; our ceiling is
 * 10 MB, so one chunk is the whole file.
 */
export async function putUploadSession(uploadUrl: string, body: BodyInit, size: number): Promise<UploadedDriveItem> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Length": String(size), "Content-Range": `bytes 0-${size - 1}/${size}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph upload session ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as UploadedDriveItem;
}
