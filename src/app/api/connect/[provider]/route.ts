import { NextResponse, type NextRequest } from "next/server";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  isProviderId,
  PROVIDERS,
  providerCredentials,
} from "@/lib/connections/providers";
import { encodeState } from "@/lib/connections/state";
import { encryptionConfigured } from "@/lib/connections/crypto";
import { requireStaffTenantId } from "@/lib/tenant/context";

// Step one of connecting a firm's Microsoft or Google account: build the
// consent URL and send the admin to it.
//
// A GET that causes no state change of its own, so it is safe to link to
// directly from the settings page.

export const dynamic = "force-dynamic";

function back(request: NextRequest, error: string) {
  const url = new URL("/dashboard/settings/site", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProviderId(provider)) return back(request, "unknown_provider");

  const staff = await getStaff();
  if (!staff) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!staffCan(staff, "manage_settings")) {
    return back(request, "not_authorized");
  }

  // Refuse before sending anyone to a consent screen we could not honour:
  // arriving back with a token we cannot store is a worse experience than
  // being told up front.
  if (!encryptionConfigured()) {
    return back(request, "encryption_key_missing");
  }

  const creds = providerCredentials(provider);
  if (!creds) return back(request, "provider_not_configured");

  const tenantId = await requireStaffTenantId();
  const config = PROVIDERS[provider];

  const redirectUri = new URL(
    `/api/connect/${provider}/callback`,
    request.url,
  ).toString();

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", creds.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", config.scopes.join(" "));
  authUrl.searchParams.set(
    "state",
    encodeState({ tenantId, provider, staffId: staff.id }),
  );
  for (const [k, v] of Object.entries(config.authParams)) {
    authUrl.searchParams.set(k, v);
  }

  return NextResponse.redirect(authUrl.toString());
}
