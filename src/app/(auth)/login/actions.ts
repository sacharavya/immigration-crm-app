"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";

export type LoginState = {
  formError?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { formError: "Invalid email or password." };
  }

  // Route by identity. An auth user is either staff or a referral agent (never
  // both — enforced in the DB). Check staff first so the dual-identity edge
  // case resolves to the higher-privilege home defensively.
  //
  // The forced-reset short-circuit also runs here (not just in the route-group
  // layouts) to avoid a flash of the destination before the layout redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: staffRow } = await supabase
      .schema("crm")
      .from("staff")
      .select("password_reset_required_at")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (staffRow) {
      if (staffRow.password_reset_required_at) redirect("/reset-password");
      redirect("/dashboard");
    }

    const { data: agentRow } = await supabase
      .schema("crm")
      .from("referral_agents")
      .select("password_reset_required_at, is_active")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (agentRow && agentRow.is_active) {
      if (agentRow.password_reset_required_at) redirect("/reset-password");
      redirect("/portal");
    }

    // Authenticated but belongs to neither table (or a deactivated agent):
    // sign out so they don't bounce between /login and a guarded layout.
    await supabase.auth.signOut();
    return { formError: "This account is not active. Contact your administrator." };
  }

  redirect("/dashboard");
}
