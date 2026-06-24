import "server-only";

import { adminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";


// Cookie that carries the verified case portal token from the public
// /upload/<token> route to the streaming proxy at /api/files/[fileId].
//
// Unlike the intake portal cookie (path-scoped to /intake), this cookie
// is path = "/" because the proxy route lives outside /upload. That
// means the cookie reaches every server route. The server-side
// verifyUploadPortalToken + per-request case-scoped authorization in
// the proxy route is what prevents misuse: every request re-verifies
// the token resolves to a case and that the requested file belongs to
// that case.
export const UPLOAD_PORTAL_COOKIE = "bbi_upload_portal";
export const UPLOAD_PORTAL_COOKIE_PATH = "/";

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

// Statuses where the portal stays active for the original checklist.
// Mirrors the ACTIVE_STATUSES constant in src/app/upload/[token]/actions.ts.
// The case lifecycle gates the portal: once closed, view + upload both
// shut.
const ACTIVE_STATUSES = [
  "retainer_pending",
  "documentation_in_progress",
  "documentation_review",
] as const;

export type PortalActor = {
  kind: "portal";
  caseId: string;
  clientId: string;
  // Held for audit / future rate-limit work. Never include in any
  // response or error message.
  token: string;
};

export type GateFailure = { ok: false; error: string };


// Resolves a token to a case row + lifecycle check. Returns the same
// shape regardless of failure reason so the route can't be used as a
// token-existence oracle.
export async function verifyUploadPortalToken(
  token: string,
): Promise<
  | { ok: true; caseId: string; clientId: string }
  | GateFailure
> {
  if (!TOKEN_RE.test(token)) return { ok: false, error: "Invalid link" };
  const admin = adminClient();
  const { data, error } = await admin
    .schema("crm")
    .from("cases")
    .select("id, client_id, status, deleted_at")
    .eq("client_portal_token", token)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Invalid link" };
  if (data.deleted_at) return { ok: false, error: "Invalid link" };

  // Active phase status keeps the portal open for the original
  // checklist. submitted_to_ircc with pending additional-doc requests
  // is also a valid window (mirrors loadCaseByPortalToken in
  // src/app/upload/[token]/actions.ts).
  if (
    ACTIVE_STATUSES.includes(data.status as (typeof ACTIVE_STATUSES)[number])
  ) {
    return { ok: true, caseId: data.id, clientId: data.client_id };
  }
  if (data.status === "submitted_to_ircc") {
    const { count } = await admin
      .schema("crm")
      .from("case_required_documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", data.id)
      .not("requested_at_event_id", "is", null);
    if ((count ?? 0) > 0) {
      return { ok: true, caseId: data.id, clientId: data.client_id };
    }
  }
  return { ok: false, error: "Invalid link" };
}

// Reads the upload-portal cookie and verifies it resolves to the
// caller-supplied caseId. The dual-mode gate pattern (parallel to
// getPortalActor in src/lib/auth/intake-portal.ts).
//
// Critical: the caller passes the caseId the action is going to act
// against, and we verify the cookie's token resolves to THAT case.
// A leaked cookie cannot be used to view files on a different case.
export async function getCasePortalActor(
  caseId: string,
): Promise<PortalActor | null> {
  const store = await cookies();
  const tokenCookie = store.get(UPLOAD_PORTAL_COOKIE);
  if (!tokenCookie) return null;
  const verified = await verifyUploadPortalToken(tokenCookie.value);
  if (!verified.ok) return null;
  if (verified.caseId !== caseId) return null;
  return {
    kind: "portal",
    caseId: verified.caseId,
    clientId: verified.clientId,
    token: tokenCookie.value,
  };
}
