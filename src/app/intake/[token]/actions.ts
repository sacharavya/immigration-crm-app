"use server";

import { cookies } from "next/headers";

import {
  INTAKE_PORTAL_COOKIE,
  INTAKE_PORTAL_COOKIE_PATH,
  verifyIntakeToken,
} from "@/lib/auth/intake-portal";
import { adminClient } from "@/lib/supabase/admin";

// Single submit action for the public intake portal. The form is
// already saved field-by-field (the section components autosave via
// the staff intake actions, dispatching to portal mode via the
// cookie); this action just stamps intake_submitted_at, which the
// gate fn treats as a hard lock from that moment on.
//
// Cookie is also cleared so a refresh (or a back-button) shows the
// public submitted-card instead of trying to re-establish a portal
// session against a now-locked row.

export async function submitIntakeForm(): Promise<
  { ok: true } | { error: string }
> {
  const store = await cookies();
  const tokenCookie = store.get(INTAKE_PORTAL_COOKIE);
  if (!tokenCookie) {
    return { error: "Your session expired. Please reopen the link." };
  }

  // verifyIntakeToken refuses tokens whose row already has
  // intake_submitted_at set — so a double-submit can't replay.
  const verified = await verifyIntakeToken(tokenCookie.value);
  if (!verified.ok) return { error: verified.error };

  const admin = adminClient();
  const { error } = await admin
    .schema("crm")
    .from("clients")
    .update({ intake_submitted_at: new Date().toISOString() })
    .eq("id", verified.clientId);
  if (error) return { error: error.message };

  // Drop the cookie. The next request to /intake/<token> will see the
  // submit-lock in the verifier and render the thank-you card.
  store.set(INTAKE_PORTAL_COOKIE, "", {
    path: INTAKE_PORTAL_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return { ok: true };
}
