"use client";

import { CheckCircle2, CircleAlert, Loader2, Unplug } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { disconnectAccount } from "../actions";

export type ConnectionView = {
  provider: "microsoft" | "google";
  account_email: string;
  account_name: string | null;
  can_store_files: boolean;
  can_send_mail: boolean;
  root_folder_path: string;
  status: string;
  last_error: string | null;
  connected_at: string;
};

const LABEL = { microsoft: "Microsoft 365", google: "Google Workspace" };

// The connect routes bounce back here with ?error=… or ?connected=…; turn
// the codes into sentences a firm admin can act on.
const ERRORS: Record<string, string> = {
  unknown_provider: "That provider is not supported.",
  not_authorized: "Only someone with the manage settings permission can connect an account.",
  encryption_key_missing:
    "This deployment has no token encryption key, so a connection cannot be stored safely. Ask whoever runs the platform to set TOKEN_ENCRYPTION_KEY.",
  provider_not_configured:
    "This provider has not been set up on the platform yet. Ask whoever runs it to add the OAuth client id and secret.",
  consent_declined: "The connection was cancelled before it finished.",
  state_malformed: "The connection link was incomplete. Start again from this page.",
  state_bad_signature: "The connection link did not come from this app. Start again from this page.",
  state_expired: "That connection attempt took longer than ten minutes. Start again.",
  state_provider_mismatch: "The provider in the link did not match. Start again.",
  missing_code: "The provider did not return an authorisation code. Try again.",
  token_exchange_failed: "The provider refused to issue a token. Check the client secret and redirect URL, then try again.",
  no_refresh_token:
    "The provider did not grant long-lived access, so the connection would stop working within the hour. Try again and make sure to approve every permission.",
  identify_failed: "Connected, but the account's name and email could not be read. Try again.",
};

export function ConnectedAccount({
  connection,
  providersConfigured,
}: {
  connection: ConnectionView | null;
  providersConfigured: { microsoft: boolean; google: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const errorCode = params.get("error");
  const justConnected = params.get("connected");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectAccount();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.replace("/dashboard/settings/storage");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Connected account
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Connect your firm&apos;s Microsoft 365 or Google Workspace. Client
            documents are then stored in your own drive and client email is
            sent from your own address, instead of the platform&apos;s.
          </p>
        </div>

        {justConnected && (
          <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
            {LABEL[justConnected as "microsoft" | "google"] ?? "Account"}{" "}
            connected. New documents and email now go through it.
          </p>
        )}
        {errorCode && (
          <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              {ERRORS[errorCode] ?? "The connection did not complete."}
              {params.get("detail") && (
                <span className="mt-1 block font-mono text-[11px] text-rose-600">
                  {params.get("detail")}
                </span>
              )}
            </span>
          </p>
        )}

        {connection ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {LABEL[connection.provider]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {connection.account_name
                      ? `${connection.account_name} · ${connection.account_email}`
                      : connection.account_email}
                  </div>
                </div>
                <span
                  className={
                    connection.status === "active"
                      ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                      : "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                  }
                >
                  {connection.status === "active"
                    ? "Connected"
                    : "Needs reconnecting"}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Documents</dt>
                  <dd className="text-foreground">
                    {connection.can_store_files
                      ? connection.root_folder_path
                        ? `Your drive, under ${connection.root_folder_path}`
                        : "Your drive"
                      : "Not granted — still using platform storage"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="text-foreground">
                    {connection.can_send_mail
                      ? `Sent from ${connection.account_email}`
                      : "Not granted — still sent by the platform"}
                  </dd>
                </div>
              </dl>

              {connection.status !== "active" && connection.last_error && (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  The provider stopped accepting this connection. This usually
                  means the password changed or access was revoked. Reconnect
                  below.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/connect/${connection.provider}`}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                Reconnect
              </a>
              <Button variant="outline" onClick={remove} disabled={pending}>
                {pending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="mr-1.5 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Disconnecting stops new documents and email going through this
              account. Files already stored there stay where they are and keep
              opening.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["microsoft", "google"] as const).map((p) => (
                <ProviderChoice
                  key={p}
                  provider={p}
                  configured={providersConfigured[p]}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Sign in with a shared mailbox such as info@yourfirm.com rather
              than a partner&apos;s personal account: the connection belongs to
              whoever signs in, and stops if they leave.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderChoice({
  provider,
  configured,
}: {
  provider: "microsoft" | "google";
  configured: boolean;
}) {
  const grants =
    provider === "microsoft"
      ? ["OneDrive / SharePoint for documents", "Outlook for client email"]
      : ["Google Drive for documents", "Gmail for client email"];

  const inner = (
    <>
      <div className="text-sm font-medium text-foreground">
        {LABEL[provider]}
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        {grants.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      {!configured && (
        <div className="mt-2 text-[11px] text-amber-900">
          Not set up on this platform yet
        </div>
      )}
    </>
  );

  if (!configured) {
    return (
      <div className="rounded-lg border border-border p-4 opacity-60">
        {inner}
      </div>
    );
  }

  return (
    <a
      href={`/api/connect/${provider}`}
      className="block rounded-lg border border-border p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--accent)]"
    >
      {inner}
      <div className="mt-3 text-sm font-medium text-[var(--primary)]">
        Connect {LABEL[provider]} →
      </div>
    </a>
  );
}
