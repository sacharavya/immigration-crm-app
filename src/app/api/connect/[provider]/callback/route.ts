import { NextResponse, type NextRequest } from "next/server";

import { getBaseUrl } from "@/lib/email/url";

import {
  isProviderId,
  PROVIDERS,
  providerCredentials,
} from "@/lib/connections/providers";
import { decodeState } from "@/lib/connections/state";
import { saveConnection } from "@/lib/connections/store";

// Step two: the provider sends the firm back here with a code. Exchange it
// for tokens and store them encrypted.
//
// The tenant comes from the signed `state`, never from the session, because
// the redirect can land in a different browser context than the one that
// started it. state is what stops a crafted callback grafting one account
// onto another firm.

export const dynamic = "force-dynamic";

function back(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/settings/site", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/** Name and email of whoever consented, for labelling the connection. */
async function identify(
  provider: "microsoft" | "google",
  accessToken: string,
): Promise<{ email: string; name: string | null }> {
  const url =
    provider === "microsoft"
      ? "https://graph.microsoft.com/v1.0/me"
      : "https://www.googleapis.com/oauth2/v2/userinfo";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Could not read the connected account.");

  const me = (await res.json()) as Record<string, string | null>;
  const email =
    me.mail ?? me.userPrincipalName ?? me.email ?? "unknown@unknown";
  return { email, name: me.displayName ?? me.name ?? null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProviderId(provider)) return back(request, { error: "unknown_provider" });

  const url = new URL(request.url);

  // The firm declined, or the provider refused.
  const denied = url.searchParams.get("error");
  if (denied) {
    return back(request, {
      error: "consent_declined",
      detail: url.searchParams.get("error_description")?.slice(0, 200) ?? denied,
    });
  }

  const state = decodeState(url.searchParams.get("state"));
  if (!state.ok) return back(request, { error: `state_${state.reason}` });
  if (state.state.provider !== provider) {
    return back(request, { error: "state_provider_mismatch" });
  }

  const code = url.searchParams.get("code");
  if (!code) return back(request, { error: "missing_code" });

  const creds = providerCredentials(provider);
  if (!creds) return back(request, { error: "provider_not_configured" });

  // Built from the app host, not the request: providers require every
  // redirect URI to be pre-registered, and firms have their own hosts. Staff
  // sessions only exist on the app host anyway, so this is also where the
  // flow always starts.
  const redirectUri = `${await getBaseUrl()}/api/connect/${provider}/callback`;

  const tokenRes = await fetch(PROVIDERS[provider].tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    return back(request, {
      error: "token_exchange_failed",
      detail: detail.slice(0, 200),
    });
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  // No refresh token means the connection dies within the hour. Better to
  // refuse now than to appear connected and break silently at lunchtime.
  if (!token.refresh_token) {
    return back(request, { error: "no_refresh_token" });
  }

  let account: { email: string; name: string | null };
  try {
    account = await identify(provider, token.access_token);
  } catch {
    return back(request, { error: "identify_failed" });
  }

  await saveConnection({
    tenantId: state.state.tenantId,
    provider,
    accountEmail: account.email,
    accountName: account.name,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresInSeconds: token.expires_in,
    // Providers return what was actually granted, which can be narrower
    // than what we asked for.
    scopes: token.scope
      ? token.scope.split(/\s+/)
      : PROVIDERS[provider].scopes,
    connectedBy: state.state.staffId,
  });

  return back(request, { connected: provider });
}
