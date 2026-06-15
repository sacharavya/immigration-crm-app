import "server-only";

import { getAccessToken, invalidateToken } from "./auth";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type StreamFileOptions = {
  // When set, requests the converted format. The format=pdf path returns
  // a 302 to a 1drv.com preauthenticated URL with the converted PDF; we
  // follow the redirect server-side so the preauth URL never reaches
  // the client.
  format?: "pdf";
};

export type StreamedGraphFile = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: string | null;
};

// Streams the raw bytes of a Drive item from Microsoft Graph.
//
// Used by /api/files/[fileId] to proxy file content to the browser
// without exposing the OneDrive URL. The Authorization bearer token
// is only ever set on the OUTBOUND request to Graph; the returned
// stream is detached from auth headers.
//
// 401 retry: if Graph rejects the cached token, invalidate it and try
// once more. Same pattern as graphFetch in src/lib/graph/client.ts.
export async function streamFileFromGraph(
  driveId: string,
  itemId: string,
  options: StreamFileOptions = {},
): Promise<StreamedGraphFile> {
  const query = options.format === "pdf" ? "?format=pdf" : "";
  const url = `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content${query}`;

  const attempt = async (token: string): Promise<Response> => {
    // fetch follows redirects by default. For format=pdf the immediate
    // response is 302 -> 1drv.com preauth URL; fetch resolves to the
    // preauth response automatically without us ever surfacing the URL.
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // The preauth URL stops accepting Authorization headers but works
      // unauthenticated; fetch handles that transparently because
      // redirect targets only inherit safe headers.
      redirect: "follow",
    });
  };

  let token = await getAccessToken();
  let res = await attempt(token);
  if (res.status === 401) {
    invalidateToken();
    token = await getAccessToken();
    res = await attempt(token);
  }

  if (!res.ok) {
    // Drain the body so we don't leak connections. We intentionally
    // throw a generic error — the route handler collapses all errors
    // to 404 so the client can't distinguish missing-file from
    // permission-denied from auth-failed.
    await res.body?.cancel().catch(() => {});
    throw new Error(`Graph download failed: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("Graph download returned an empty body");
  }

  return {
    body: res.body,
    contentType:
      res.headers.get("content-type") ?? "application/octet-stream",
    contentLength: res.headers.get("content-length"),
  };
}
