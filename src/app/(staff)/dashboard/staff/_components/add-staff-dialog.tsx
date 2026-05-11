"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type Role } from "@/lib/auth/permissions";
import { ROLES, selectableRoles } from "@/lib/validators/staff";

import { addStaff } from "../actions";

const ROLE_LABEL: Record<Role, string> = {
  super_user: "Super User",
  admin: "Admin",
  rcic: "RCIC",
  document_officer: "Document Officer",
  reception: "Reception",
  readonly: "Read-only",
  paralegal: "Paralegal (legacy)",
  staff: "Staff (legacy)",
};

export function AddStaffDialog({ actorRole }: { actorRole: Role }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | "">("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<{
    tempPassword: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRole("");
    setError(null);
    setFieldErrors({});
    setSuccess(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Reset every time the dialog opens, so a previous run's success
    // view (with its temp password) doesn't leak into a fresh session.
    if (next) reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      first_name: fd.get("first_name"),
      last_name: fd.get("last_name"),
      email: fd.get("email"),
      role: fd.get("role"),
      phone: fd.get("phone"),
      cicc_license_no: fd.get("cicc_license_no"),
    };

    startTransition(async () => {
      const result = await addStaff(payload);
      if ("error" in result) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      setSuccess({
        tempPassword: result.tempPassword,
        emailSent: result.emailSent,
        emailError: result.emailError,
      });
    });
  }

  const allowedRoles = selectableRoles(actorRole);

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>+ Add staff</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          {success ? (
            <SuccessView
              tempPassword={success.tempPassword}
              emailSent={success.emailSent}
              emailError={success.emailError}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add staff</DialogTitle>
                <DialogDescription>
                  Creates the auth user and staff record, and emails them a
                  welcome message with the temporary password. The password
                  is also shown here as a backup. They&apos;ll be required
                  to reset on first login.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="first_name">First name</FieldLabel>
                      <Input
                        id="first_name"
                        name="first_name"
                        required
                        aria-invalid={Boolean(fieldErrors.first_name)}
                      />
                      {fieldErrors.first_name && (
                        <FieldError
                          errors={fieldErrors.first_name.map((m) => ({
                            message: m,
                          }))}
                        />
                      )}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                      <Input
                        id="last_name"
                        name="last_name"
                        required
                        aria-invalid={Boolean(fieldErrors.last_name)}
                      />
                      {fieldErrors.last_name && (
                        <FieldError
                          errors={fieldErrors.last_name.map((m) => ({
                            message: m,
                          }))}
                        />
                      )}
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="off"
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                    />
                    {fieldErrors.email && (
                      <FieldError
                        errors={fieldErrors.email.map((m) => ({ message: m }))}
                      />
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="role">Role</FieldLabel>
                    <select
                      id="role"
                      name="role"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      aria-invalid={Boolean(fieldErrors.role)}
                      className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                    >
                      <option value="" disabled>
                        Pick…
                      </option>
                      {ROLES.filter((r) => allowedRoles.includes(r)).map(
                        (r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ),
                      )}
                    </select>
                    {fieldErrors.role && (
                      <FieldError
                        errors={fieldErrors.role.map((m) => ({ message: m }))}
                      />
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input id="phone" name="phone" />
                    <FieldDescription>Optional.</FieldDescription>
                  </Field>

                  {role === "rcic" && (
                    <Field>
                      <FieldLabel htmlFor="cicc_license_no">
                        CICC license #
                      </FieldLabel>
                      <Input id="cicc_license_no" name="cicc_license_no" />
                      <FieldDescription>
                        Required for RCIC sign-off; optional during invite.
                      </FieldDescription>
                    </Field>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}
                </FieldGroup>

                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      "Add staff"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SuccessView({
  tempPassword,
  emailSent,
  emailError,
  onClose,
}: {
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>Staff added</DialogTitle>
            <DialogDescription>
              {emailSent
                ? "Welcome email sent. Share the password directly only if delivery fails."
                : "Welcome email could not be sent — share the password with them directly."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Temporary password
        </div>
        <code className="block rounded bg-white px-3 py-2 font-mono text-sm">
          {tempPassword}
        </code>
        <p className="text-xs text-stone-500">
          The user will be forced to reset on first login.
        </p>
        {!emailSent && emailError && (
          <p className="text-xs text-amber-700">Email error: {emailError}</p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}
