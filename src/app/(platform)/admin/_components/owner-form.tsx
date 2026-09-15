"use client";

import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createTenantOwner } from "../actions";

export type OwnerFormProps = {
  tenantId: string;
  tenantName: string;
  /** Staff already in this firm. Zero means nobody can sign in yet. */
  staffCount: number;
};

export function OwnerForm({ tenantId, tenantName, staffCount }: OwnerFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [issued, setIssued] = useState<{
    email: string;
    tempPassword: string;
    emailed: boolean;
  } | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTenantOwner({
        tenant_id: tenantId,
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIssued({
        email: result.email,
        tempPassword: result.tempPassword,
        emailed: result.emailed,
      });
      setFirst("");
      setLast("");
      setEmail("");
      setOpen(false);
      router.refresh();
    });
  }

  async function copyPassword() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard permission; the password is on screen to copy by hand.
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Owner account</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {staffCount === 0
              ? "Nobody can sign in to this firm yet. Create the first account — a super user who can then invite the rest of their team."
              : `${staffCount} ${staffCount === 1 ? "person has" : "people have"} access. The firm manages its own team from here on; add another owner only if they are locked out.`}
          </p>
        </div>

        {issued && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-900">
              Account created for {issued.email}
            </p>
            <p className="text-xs text-emerald-800">
              {issued.emailed
                ? "The sign-in details were emailed to them. They must set a new password on first login."
                : "The welcome email could not be sent, so pass these on yourself. They must set a new password on first login."}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-emerald-200 bg-white px-2 py-1.5 font-mono text-[13px] text-stone-800">
                {issued.tempPassword}
              </code>
              <Button size="sm" variant="outline" onClick={copyPassword}>
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-emerald-700">
              This password is shown once and cannot be retrieved later.
            </p>
          </div>
        )}

        {!open ? (
          <Button
            variant={staffCount === 0 ? "default" : "outline"}
            onClick={() => {
              setOpen(true);
              setIssued(null);
            }}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {staffCount === 0 ? "Create owner account" : "Add another owner"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="o-first">First name</Label>
                <Input
                  id="o-first"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-last">Last name</Label>
                <Input
                  id="o-last"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="o-email">Email</Label>
              <Input
                id="o-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@firm.com"
              />
              <p className="text-xs text-stone-500">
                They sign in at the normal staff login and land in{" "}
                {tenantName}. Use an address that is not a platform admin, or
                this portal&apos;s account would gain access to their data.
              </p>
            </div>

            {error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={pending || !first.trim() || !last.trim() || !email.trim()}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
