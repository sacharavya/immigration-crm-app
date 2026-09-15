"use client";

import { Check, Copy, KeyRound, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  resetTenantMemberPassword,
  updateTenantMember,
  type TenantMember,
} from "../actions";

const ROLES = [
  { value: "super_user", label: "Owner (full control)" },
  { value: "admin", label: "Admin" },
  { value: "rcic", label: "RCIC" },
  { value: "document_officer", label: "Document officer" },
  { value: "reception", label: "Reception" },
  { value: "readonly", label: "Read only" },
] as const;

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

function relative(iso: string | null): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA");
}

export function MembersTable({
  members,
  tenantName,
}: {
  members: TenantMember[];
  tenantName: string;
}) {
  const active = members.filter((m) => m.is_active).length;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Members{" "}
            <span className="font-normal text-stone-500">
              ({members.length} total, {active} active)
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Accounts that can sign in to {tenantName}. You can change a
            person&apos;s role or reset their password here; their clients and
            cases remain unreadable from this portal.
          </p>
        </div>

        {members.length === 0 ? (
          <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">
            No members yet. Create the owner account above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.staff_id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: TenantMember }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(member.first_name);
  const [last, setLast] = useState(member.last_name);
  const [role, setRole] = useState(member.role);
  const [isActive, setIsActive] = useState(member.is_active);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [issued, setIssued] = useState<{
    tempPassword: string;
    emailed: boolean;
  } | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateTenantMember({
        staff_id: member.staff_id,
        first_name: first.trim(),
        last_name: last.trim(),
        role,
        is_active: isActive,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function resetPassword() {
    setError(null);
    setIssued(null);
    startTransition(async () => {
      const result = await resetTenantMemberPassword({
        staff_id: member.staff_id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIssued({
        tempPassword: result.tempPassword,
        emailed: result.emailed,
      });
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
      // No clipboard permission; it is on screen to copy by hand.
    }
  }

  return (
    <>
      <tr className="border-b border-stone-100 last:border-0">
        <td className="px-4 py-3">
          <div className="font-medium text-stone-900">
            {member.first_name} {member.last_name}
          </div>
          <div className="text-xs text-stone-500">{member.email}</div>
        </td>
        <td className="px-4 py-3 text-stone-700">
          {ROLE_LABEL[member.role] ?? member.role}
        </td>
        <td className="px-4 py-3">
          <span
            className={
              member.is_active
                ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                : "rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            }
          >
            {member.is_active ? "Active" : "Deactivated"}
          </span>
          {member.password_reset_required && (
            <span className="ml-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
              Reset pending
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-stone-600">
          {relative(member.last_login_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing((v) => !v)}
              disabled={pending}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {editing ? "Close" : "Edit"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetPassword}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="mr-1 h-3.5 w-3.5" />
              )}
              Reset password
            </Button>
          </div>
        </td>
      </tr>

      {(editing || issued || error) && (
        <tr className="border-b border-stone-100 bg-stone-50/60 last:border-0">
          <td colSpan={5} className="px-4 py-3">
            {issued && (
              <div className="mb-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-900">
                  Temporary password for {member.email}
                </p>
                <p className="text-xs text-emerald-800">
                  {issued.emailed
                    ? "Emailed to them. They must choose a new password on next sign-in."
                    : "The email could not be sent, so pass this on yourself. They must choose a new password on next sign-in."}
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
                  Shown once and not retrievable later.
                </p>
              </div>
            )}

            {editing && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`f-${member.staff_id}`}>First name</Label>
                    <Input
                      id={`f-${member.staff_id}`}
                      value={first}
                      onChange={(e) => setFirst(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`l-${member.staff_id}`}>Last name</Label>
                    <Input
                      id={`l-${member.staff_id}`}
                      value={last}
                      onChange={(e) => setLast(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`r-${member.staff_id}`}>Role</Label>
                    <select
                      id={`r-${member.staff_id}`}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Account is active
                </label>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setError(null);
                    }}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
