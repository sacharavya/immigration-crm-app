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
    const { data: staffRow, error: staffRowErr } = await supabase
      .schema("crm")
      .from("staff")
      .select("password_reset_required_at")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (staffRowErr) console.error("[auth/login] staff lookup failed:", staffRowErr.message);
    if (staffRow) {
      if (staffRow.password_reset_required_at) redirect("/reset-password");
      redirect("/dashboard");
    }

    // Platform operators have no staff row by design — they belong to no
    // firm — so they are routed to the admin portal instead.
    const { data: adminRow, error: adminRowErr } = await supabase
      .schema("platform")
      .from("admins")
      .select("auth_user_id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminRowErr) console.error("[auth/login] platform admin lookup failed:", adminRowErr.message);
    if (adminRow) redirect("/admin");

    const { data: agentRow, error: agentRowErr } = await supabase
      .schema("crm")
      .from("referral_agents")
      .select("password_reset_required_at, is_active")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (agentRowErr) console.error("[auth/login] referral agent lookup failed:", agentRowErr.message);
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
