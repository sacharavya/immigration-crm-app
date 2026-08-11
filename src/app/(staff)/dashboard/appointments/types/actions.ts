"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// Appointment-type CRUD. manage_settings (super_user / admin) gates every
// mutation. The Calendar page itself stays gated by manage_appointments —
// types/settings administration is its own narrower surface so reception
// (which has manage_appointments) cannot reshape the firm's offering.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type TypeMutateResult = Ok | Err;
export type CreateTypeResult = (Ok & { id: string }) | Err;

const codeRegex = /^[a-z0-9_]+$/;

const baseFields = {
  name: z.string().min(1).max(100),
  duration_minutes: z.number().int().min(30).max(240),
  default_location_type: z.enum(["online", "onsite"]),
  description: z.string().min(1).max(200),
  preparation_notes: z.string().max(2000).nullable(),
  is_public: z.boolean(),
  requires_case: z.boolean(),
  requires_consultation_agreement: z.boolean().default(false),
  fee_cad: z.number().min(0).max(100000).nullable(),
  display_order: z.number().int().min(0).max(10000).default(100),
};

const createSchema = z.object({
  ...baseFields,
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(codeRegex, "Lowercase letters, numbers, underscores only"),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  ...baseFields,
});

async function requireManageSettings(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) {
    return { ok: false, error: "Not authorized" };
  }
  return { ok: true };
}

function revalidateAll() {
  revalidatePath("/dashboard/appointments/types");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/book-an-appointment"); // public types may have shifted
}

// ---------------------------------------------------------------------------
// createAppointmentType
// ---------------------------------------------------------------------------

export async function createAppointmentType(
  raw: unknown,
): Promise<CreateTypeResult> {
  const auth = await requireManageSettings();
  if (!auth.ok) return { error: auth.error };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Code uniqueness — DB has a UNIQUE constraint but checking up front
  // gives a clearer error than the raw constraint violation.
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select("id")
    .eq("code", data.code)
    .maybeSingle();
  if (existing) {
    return { error: `Code "${data.code}" is already in use.` };
  }

  const { data: inserted, error } = await supabase
    .schema("crm")
    .from("appointment_types")
    .insert({
      name: data.name,
      code: data.code,
      duration_minutes: data.duration_minutes,
      default_location_type: data.default_location_type,
      description: data.description,
      preparation_notes: data.preparation_notes,
      is_public: data.is_public,
      requires_case: data.requires_case,
      requires_consultation_agreement: data.requires_consultation_agreement,
      fee_cad: data.fee_cad,
      display_order: data.display_order,
      active: true,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return { error: error?.message ?? "Could not create type." };
  }

  revalidateAll();
  return { ok: true, id: inserted.id };
}

// ---------------------------------------------------------------------------
// updateAppointmentType — code is intentionally NOT editable
// ---------------------------------------------------------------------------

export async function updateAppointmentType(
  raw: unknown,
): Promise<TypeMutateResult> {
  const auth = await requireManageSettings();
  if (!auth.ok) return { error: auth.error };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...patch } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("appointment_types")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// archive / unarchive — flips `active` without touching `deleted_at`
// ---------------------------------------------------------------------------

async function setActive(
  id: string,
  active: boolean,
): Promise<TypeMutateResult> {
  const auth = await requireManageSettings();
  if (!auth.ok) return { error: auth.error };
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Invalid id" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("appointment_types")
    .update({ active })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function archiveAppointmentType(
  id: string,
): Promise<TypeMutateResult> {
  return setActive(id, false);
}

export async function unarchiveAppointmentType(
  id: string,
): Promise<TypeMutateResult> {
  return setActive(id, true);
}

// ---------------------------------------------------------------------------
// duplicateAppointmentType — clones with " (copy)" + "_copy" suffix
// ---------------------------------------------------------------------------

export async function duplicateAppointmentType(
  id: string,
): Promise<CreateTypeResult> {
  const auth = await requireManageSettings();
  if (!auth.ok) return { error: auth.error };
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Invalid id" };
  }

  const supabase = await createClient();
  const { data: original } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "name, code, duration_minutes, default_location_type, description, preparation_notes, is_public, requires_case, requires_consultation_agreement, fee_cad, display_order",
    )
    .eq("id", id)
    .maybeSingle();
  if (!original) return { error: "Type not found." };

  // Generate a unique code by appending _copy / _copy_2 / ... until free.
  const baseCode = `${original.code}_copy`;
  let candidate = baseCode;
  let suffix = 2;
  // Guard the loop — won't iterate more than a handful of times in practice.
  while (suffix < 50) {
    const { data: clash } = await supabase
      .schema("crm")
      .from("appointment_types")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (!clash) break;
    candidate = `${baseCode}_${suffix++}`;
  }

  const { data: inserted, error } = await supabase
    .schema("crm")
    .from("appointment_types")
    .insert({
      name: `${original.name} (copy)`,
      code: candidate,
      duration_minutes: original.duration_minutes,
      default_location_type: original.default_location_type,
      description: original.description,
      preparation_notes: original.preparation_notes,
      is_public: original.is_public,
      requires_case: original.requires_case,
      requires_consultation_agreement: original.requires_consultation_agreement,
      fee_cad: original.fee_cad,
      display_order: original.display_order,
      active: true,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return { error: error?.message ?? "Could not duplicate type." };
  }

  revalidateAll();
  return { ok: true, id: inserted.id };
}

// ---------------------------------------------------------------------------
// deleteAppointmentType — super_user only, soft-delete, guarded by future use
// ---------------------------------------------------------------------------

export async function deleteAppointmentType(
  id: string,
): Promise<TypeMutateResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  // No dedicated permission exists for this; mirror the spec by checking
  // role directly. delete_cases-style escalation can be added later if
  // the firm wants per-permission control.
  if (staff.role !== "super_user") {
    return { error: "Only super users can delete appointment types." };
  }
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Invalid id" };
  }

  const supabase = await createClient();

  // Guard: refuse if any confirmed future appointment still references it.
  const { count } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("appointment_type_id", id)
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .gte("starts_at", new Date().toISOString());
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete: ${count} future appointment${count === 1 ? "" : "s"} use this type. Archive instead.`,
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("appointment_types")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateAll();
  return { ok: true };
}
