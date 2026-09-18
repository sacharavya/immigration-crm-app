/**
 * What each provider needs, in one place.
 *
 * Scopes are requested as a single set covering both jobs a connection does:
 * storing documents and sending mail. One consent screen is far easier for a
 * small practice than two, and a firm that declines part of it still gets a
 * working connection — crm.connection_status() reports which half it covers,
 * and the app falls back for the other.
 */

export type ProviderId = "microsoft" | "google";

export type ProviderConfig = {
  id: ProviderId;
  label: string;
  /** Shown on the connect button so a firm knows what it is agreeing to. */
  grants: string[];
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Extra params the provider needs to return a refresh token. */
  authParams: Record<string, string>;
};

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  microsoft: {
    id: "microsoft",
    label: "Microsoft 365",
    grants: [
      "Store client documents in your OneDrive or SharePoint",
      "Send client email from your address",
      "Read your name and email to label the connection",
    ],
    // `common` accepts both work/school and personal accounts; a firm on a
    // single tenant can swap this for their tenant id later.
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "openid",
      "email",
      "profile",
      // offline_access is what makes the connection outlive the browser
      // session; without it there is no refresh token and storage breaks
      // within the hour.
      "offline_access",
      "Files.ReadWrite.All",
      "Mail.Send",
    ],
    authParams: {
      response_mode: "query",
      // Forces the consent screen, so reconnecting after a scope change
      // actually re-grants rather than silently reusing the old set.
      prompt: "consent",
    },
  },

  google: {
    id: "google",
    label: "Google Workspace",
    grants: [
      "Store client documents in your Google Drive",
      "Send client email from your Gmail address",
      "Read your name and email to label the connection",
    ],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      // drive.file, not drive: the app can only touch files it creates
      // itself, so connecting does not hand us a firm's entire Drive. It is
      // the honest scope for this job and a much easier thing to agree to.
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    authParams: {
      access_type: "offline",
      // Google only returns a refresh token on the first consent unless
      // asked again explicitly.
      prompt: "consent",
      include_granted_scopes: "true",
    },
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return value === "microsoft" || value === "google";
}

/** Client id and secret for a provider, or null when it is not set up. */
export function providerCredentials(
  id: ProviderId,
): { clientId: string; clientSecret: string } | null {
  const clientId =
    id === "microsoft"
      ? process.env.MS_OAUTH_CLIENT_ID
      : process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret =
    id === "microsoft"
      ? process.env.MS_OAUTH_CLIENT_SECRET
      : process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Which of the two jobs a granted scope set actually covers. */
export function capabilitiesFor(scopes: string[]): {
  files: boolean;
  mail: boolean;
} {
  const has = (fragment: string) =>
    scopes.some((s) => s.toLowerCase().includes(fragment));
  return {
    files: has("files.readwrite") || has("drive"),
    mail: has("mail.send") || has("gmail.send"),
  };
}
