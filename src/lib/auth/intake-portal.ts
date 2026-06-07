import "server-only";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/types";

// Cookie that carries the verified intake-portal token from the
// public /intake/<token> page to the server actions invoked from
// the embedded section components.
//
// Path is scoped to /intake so the cookie NEVER reaches staff routes
// (preventing a leaked token from being treated as a session anywhere
// else). HttpOnly + SameSite=Lax so it's not readable from JS and not
// sent on cross-site sub-requests.
export const INTAKE_PORTAL_COOKIE = "bbi_intake_portal";
export const INTAKE_PORTAL_COOKIE_PATH = "/intake";

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

export type PortalActor = {
  kind: "portal";
  clientId: string;
  // The token is held for audit / future rate-limit work. Do NOT
  // include it in any response or error message.
  token: string;
};

export type GateFailure = { ok: false; error: string };

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Resolves a token to a client row and rejects on submit-lock. Returns
// the same shape regardless of failure reason — never leak whether
// the token was unknown vs. locked vs. malformed, to avoid an oracle
// for token guessing.
export async function verifyIntakeToken(
  token: string,
): Promise<{ ok: true; clientId: string } | GateFailure> {
  if (!TOKEN_RE.test(token)) return { ok: false, error: "Invalid link" };
  const admin = adminClient();
  const { data, error } = await admin
    .schema("crm")
    .from("clients")
    .select("id, intake_submitted_at, deleted_at")
    .eq("intake_portal_token", token)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Invalid link" };
  if (data.deleted_at) return { ok: false, error: "Invalid link" };
  if (data.intake_submitted_at) {
    return { ok: false, error: "This intake form has already been submitted." };
  }
  return { ok: true, clientId: data.id };
}

// Looks for the portal cookie and (if present) verifies it. Used by
// the staff intake server actions to decide whether the request is
// staff-authenticated or token-authenticated.
//
// Critically: the caller passes the clientId that the FORM is trying
// to write to. We verify it matches the row resolved by the token —
// this defeats a forged hidden `clientId` field from a malicious or
// confused public client.
export async function getPortalActor(
  clientIdFromForm: string,
): Promise<PortalActor | null> {
  const store = await cookies();
  const tokenCookie = store.get(INTAKE_PORTAL_COOKIE);
  if (!tokenCookie) return null;
  const verified = await verifyIntakeToken(tokenCookie.value);
  if (!verified.ok) return null;
  if (verified.clientId !== clientIdFromForm) return null;
  return {
    kind: "portal",
    clientId: verified.clientId,
    token: tokenCookie.value,
  };
}
