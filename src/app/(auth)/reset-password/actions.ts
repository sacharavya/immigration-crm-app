"use server";

import { adminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validators/auth";

export type ResetPasswordState = {
  formError?: string;
  fieldErrors?: {
    newPassword?: string[];
    confirmPassword?: string[];
  };
  // On success the client performs a full-page navigation here (see below).
  redirectTo?: string;
};

// Service-role client used only to clear password_reset_required_at on
// the user's own staff row. RLS on crm.staff restricts UPDATE to
// super_user/admin roles, so non-admin staff would otherwise be unable
// to clear the flag themselves and end up looping back into this page.

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as
      | ResetPasswordState["fieldErrors"]
      | undefined;
    return { fieldErrors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateErr) {
    return { formError: updateErr.message };
  }

  // Clear the forced-reset flag via service role. The cookie-based client is
  // gated by RLS (staff: super_user/admin only; agents have no self-write
  // policy), so the user's own UPDATE silently affects zero rows and they end
  // up looping back here. Service role bypasses RLS — safe because we scope the
  // UPDATE to this auth user's own row. The user is exactly one of staff or
  // agent (mutual exclusion), so clearing both is correct: one affects one row,
  // the other zero.
  const admin = adminClient();
  const [{ error: clearStaffErr }, { error: clearAgentErr }] = await Promise.all([
    admin
      .schema("crm")
      .from("staff")
      .update({ password_reset_required_at: null })
      .eq("auth_user_id", user.id),
    admin
      .schema("crm")
      .from("referral_agents")
      .update({ password_reset_required_at: null })
      .eq("auth_user_id", user.id),
  ]);
  if (clearStaffErr || clearAgentErr) {
    console.error(
      `[resetPassword] cleared password but could not clear flag for ${user.id}:`,
      clearStaffErr ?? clearAgentErr,
    );
    return {
      formError:
        "Password updated, but we couldn't clear the reset flag. Contact an administrator.",
    };
  }

  // Hand off to /logout (route handler) which does signOut + redirect
  // atomically on a fresh request. Doing signOut() + redirect() in this
  // Server Action can race: the deletion cookies sometimes don't make it
  // onto the redirect response, leaving the recovery session alive and the
  // user dropped straight back to /dashboard. The route handler avoids that.
  //
  // We must NOT redirect() to /logout from here: /logout is a route handler,
  // not a page, so a Server Action redirect() makes the client router attempt
  // an RSC navigation it cannot parse ("An unexpected response was received
  // from the server"). Instead we return the URL and let the client do a real
  // browser navigation (window.location), the same mechanism the sidebar's
  // POST-form logout uses, which reaches the handler correctly.
  return {
    redirectTo: "/logout?next=" + encodeURIComponent("/login?reset=1"),
  };
}
