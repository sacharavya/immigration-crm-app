"use client";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    initialState,
  );

  // On success the action returns the /logout URL. /logout is a route handler
  // that signs out and 303-redirects, so it needs a full browser navigation,
  // not a client-router push.
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <CaseBindLogo className="mx-auto h-14 w-auto text-[#0F5132]" />
          <CardTitle className="text-2xl text-[var(--navy)]">
            Set a new password
          </CardTitle>
          <CardDescription>
            For security, you need to choose a new password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} noValidate>
            <FieldGroup>
              {state.formError && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {state.formError}
                </p>
              )}

              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(state.fieldErrors?.newPassword)}
                />
                {state.fieldErrors?.newPassword ? (
                  <FieldError
                    errors={state.fieldErrors.newPassword.map((m) => ({
                      message: m,
                    }))}
                  />
                ) : (
                  <FieldDescription>
                    At least 12 characters, including a letter and a number.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
                />
                {state.fieldErrors?.confirmPassword && (
                  <FieldError
                    errors={state.fieldErrors.confirmPassword.map((m) => ({
                      message: m,
                    }))}
                  />
                )}
              </Field>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save new password"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
