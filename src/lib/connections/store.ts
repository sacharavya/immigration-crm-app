import "server-only";

import { adminClient } from "@/lib/supabase/admin";

import { decryptToken, encryptToken } from "./crypto";
import { PROVIDERS, providerCredentials, type ProviderId } from "./providers";

/**
 * Reading, refreshing and storing a firm's connection.
 *
 * Everything here runs as service role, because crm.tenant_connections
 * grants nothing to `authenticated` — not even a firm's own staff can read
 * their own ciphertext.
 */

export type Connection = {
  id: string;
  tenantId: string;
  provider: ProviderId;
  accountEmail: string;
  accountName: string | null;
  scopes: string[];
  driveId: string | null;
  rootFolderId: string | null;
  rootFolderPath: string;
  status: "active" | "needs_reauth" | "revoked";
};

type Row = {
  id: string;
  tenant_id: string;
  provider: ProviderId;
  account_email: string;
  account_name: string | null;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string;
  scopes: string[];
  drive_id: string | null;
  root_folder_id: string | null;
  root_folder_path: string;
  status: Connection["status"];
};

function toConnection(row: Row): Connection {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    provider: row.provider,
    accountEmail: row.account_email,
    accountName: row.account_name,
    scopes: row.scopes,
    driveId: row.drive_id,
    rootFolderId: row.root_folder_id,
    rootFolderPath: row.root_folder_path,
    status: row.status,
  };
}

/** The firm's connection, if it has one. */
export async function getConnection(
  tenantId: string,
): Promise<Connection | null> {
  const { data } = await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data ? toConnection(data as Row) : null;
}

export async function saveConnection(input: {
  tenantId: string;
  provider: ProviderId;
  accountEmail: string;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  scopes: string[];
  connectedBy: string | null;
}): Promise<void> {
  const expiresAt = new Date(
    Date.now() + input.expiresInSeconds * 1000,
  ).toISOString();

  await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .upsert(
      {
        tenant_id: input.tenantId,
        provider: input.provider,
        account_email: input.accountEmail,
        account_name: input.accountName,
        access_token_enc: encryptToken(input.accessToken),
        refresh_token_enc: input.refreshToken
          ? encryptToken(input.refreshToken)
          : null,
        expires_at: expiresAt,
        scopes: input.scopes,
        status: "active",
        last_error: null,
        last_refreshed_at: new Date().toISOString(),
        connected_by: input.connectedBy,
      },
      { onConflict: "tenant_id,provider" },
    );
}

export async function disconnect(tenantId: string): Promise<void> {
  await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .delete()
    .eq("tenant_id", tenantId);
}

async function markNeedsReauth(id: string, message: string): Promise<void> {
  await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .update({ status: "needs_reauth", last_error: message })
    .eq("id", id);
}

/**
 * A usable access token for the firm, refreshing first if it is close to
 * expiry.
 *
 * Returns null rather than throwing when the firm has no connection, so
 * callers can fall back to the platform's own storage or mail. Throws only
 * when a connection exists but cannot be used, because that is a real fault
 * the firm needs to see rather than silently route around.
 */
export async function getAccessToken(
  tenantId: string,
): Promise<{ token: string; connection: Connection } | null> {
  const { data } = await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return null;
  const row = data as Row;
  const connection = toConnection(row);

  if (row.status !== "active") {
    throw new Error(
      `Your ${PROVIDERS[row.provider].label} connection needs to be reconnected in Settings.`,
    );
  }

  // Refresh a minute early; a token that expires mid-upload is worse than
  // one refreshed slightly too often.
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return { token: decryptToken(row.access_token_enc), connection };
  }

  if (!row.refresh_token_enc) {
    await markNeedsReauth(row.id, "No refresh token; reconnect required.");
    throw new Error(
      `Your ${PROVIDERS[row.provider].label} connection expired. Reconnect it in Settings.`,
    );
  }

  const creds = providerCredentials(row.provider);
  if (!creds) {
    throw new Error(
      `${PROVIDERS[row.provider].label} is not configured on this deployment.`,
    );
  }

  const res = await fetch(PROVIDERS[row.provider].tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: decryptToken(row.refresh_token_enc),
    }).toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Consent revoked, password changed, licence removed: park it rather
    // than retrying forever on every upload.
    await markNeedsReauth(row.id, detail.slice(0, 400));
    throw new Error(
      `Your ${PROVIDERS[row.provider].label} connection was rejected. Reconnect it in Settings.`,
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await adminClient()
    .schema("crm")
    .from("tenant_connections")
    .update({
      access_token_enc: encryptToken(json.access_token),
      // Google usually omits a new refresh token; keep the existing one.
      ...(json.refresh_token
        ? { refresh_token_enc: encryptToken(json.refresh_token) }
        : {}),
      expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
      last_refreshed_at: new Date().toISOString(),
      status: "active",
      last_error: null,
    })
    .eq("id", row.id);

  return { token: json.access_token, connection };
}
