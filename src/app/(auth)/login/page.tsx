"use client";

import Image from "next/image";
import { use, useActionState } from "react";

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

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

type Props = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

export default function LoginPage({ searchParams }: Props) {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const params = use(searchParams);

  const banner =
    params.error === "unauthorized"
      ? "Your account does not have access. Sign in with an authorised staff account."
      : state.formError;
  const success =
    params.reset === "1"
      ? "Password updated. Sign in with your new password."
      : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={64}
            height={64}
            priority
            className="mx-auto h-16 w-16 rounded-xl"
          />
          <CardTitle className="text-2xl text-[var(--navy)]">
            Big Bang Immigration
          </CardTitle>
          <CardDescription>Sign in to the staff console.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} noValidate>
            <FieldGroup>
              {success && !banner ? (
                <p
                  role="status"
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                >
                  {success}
                </p>
              ) : null}
              {banner ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {banner}
                </p>
              ) : null}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(state.fieldErrors?.email)}
                />
                {state.fieldErrors?.email ? (
                  <FieldError
                    errors={state.fieldErrors.email.map((message) => ({
                      message,
                    }))}
                  />
                ) : (
                  <FieldDescription>
                    Use the email registered with your staff account.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(state.fieldErrors?.password)}
                />
                {state.fieldErrors?.password ? (
                  <FieldError
                    errors={state.fieldErrors.password.map((message) => ({
                      message,
                    }))}
                  />
                ) : null}
              </Field>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Signing in…" : "Sign in"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
