"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { resetPasswordSchema } from "@/lib/validators/auth";

export type ResetPasswordState = {
  formError?: string;
  fieldErrors?: {
    newPassword?: string[];
    confirmPassword?: string[];
  };
};

// Service-role client used only to clear password_reset_required_at on
// the user's own staff row. RLS on crm.staff restricts UPDATE to
// super_user/admin roles, so non-admin staff would otherwise be unable
// to clear the flag themselves and end up looping back into this page.
function adminClient() {
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

  // Clear the forced-reset flag via service role. The cookie-based
  // client is gated by RLS (super_user/admin only), so a regular staff
  // member's UPDATE silently affects zero rows and they end up looping
  // back here. Service role bypasses RLS — safe because we scope the
  // UPDATE to this auth user's own staff row.
  const admin = adminClient();
  const { error: clearErr } = await admin
    .schema("crm")
    .from("staff")
    .update({ password_reset_required_at: null })
    .eq("auth_user_id", user.id);
  if (clearErr) {
    console.error(
      `[resetPassword] cleared password but could not clear flag for ${user.id}:`,
      clearErr,
    );
    return {
      formError:
        "Password updated, but we couldn't clear the reset flag. Contact an administrator.",
    };
  }

  // Hand off to /logout (route handler) which does signOut + redirect
  // atomically. Doing signOut() + redirect() in this Server Action can
  // race: the deletion cookies sometimes don't make it onto the
  // redirect response, leaving the recovery session alive and the user
  // dropped straight back to /dashboard. The route handler avoids that.
  redirect("/logout?next=" + encodeURIComponent("/login?reset=1"));
}
