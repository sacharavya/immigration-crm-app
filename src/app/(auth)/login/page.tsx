"use client";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { use, useActionState } from "react";

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
    <main className="flex min-h-dvh bg-[var(--surface-sunken)]">
      {/* ── Left: form panel ───────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <CaseBindLogo className="h-12 w-auto text-[#0F5132]" />

          {/* Heading */}
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-stone-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Access your firm&apos;s staff console to manage cases,
            clients, and appointments.
          </p>

          {/* Form */}
          <form action={formAction} noValidate className="mt-8 space-y-5">
            {success && !banner && (
              <p
                role="status"
                className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                {success}
              </p>
            )}
            {banner && (
              <p
                role="alert"
                className="border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900"
              >
                {banner}
              </p>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(state.fieldErrors?.email)}
                placeholder="you@yourfirm.com"
                className="mt-1.5 h-11 w-full border border-stone-300 bg-white px-3 text-sm"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-stone-700"
                >
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[var(--navy)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={Boolean(state.fieldErrors?.password)}
                placeholder="Enter your password"
                className="mt-1.5 h-11 w-full border border-stone-300 bg-white px-3 text-sm"
              />
              {state.fieldErrors?.password && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--navy)] text-sm font-medium text-white hover:bg-[var(--navy-light)] disabled:opacity-60"
            >
              {isPending ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-stone-500">
            &copy; {new Date().getFullYear()} CaseBind Systems
          </p>
        </div>
      </div>

      {/* ── Right: showcase panel ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:bg-[var(--navy)] lg:p-12 xl:p-16">
        <div className="max-w-lg text-center">
          {/* Dashboard preview placeholder */}
          <div className="mx-auto w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.07] p-1 shadow-2xl">
            <div className="rounded-lg bg-white/[0.05] px-6 py-10">
              <div className="flex items-center justify-center gap-3">
                <CaseBindLogo tone="dark" className="h-10 w-auto" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { n: "142", label: "Active cases" },
                  { n: "38", label: "This month" },
                  { n: "96%", label: "On track" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-white/10 px-3 py-4"
                  >
                    <div className="text-2xl font-bold text-white">
                      {stat.n}
                    </div>
                    <div className="mt-1 text-xs text-stone-300">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">
            Staff Console
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug text-white">
            Manage cases, track documents,
            <br />
            and serve clients — all in one place
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-stone-300">
            The complete case management platform built for Canadian
            immigration firms.
          </p>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-stone-400">
            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
              Secure
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Globe className="h-4 w-4 text-[var(--gold)]" />
              Canada-wide
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
