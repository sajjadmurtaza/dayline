import { unsupportedLiveConnector, type Connector } from "@/domains/connectors/types";
import { googleReadScope } from "@/domains/calendars/google";

export const GOOGLE_CALENDAR_ID = "google-calendar";

export function googleOAuthUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleReadScope());
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export const googleCalendarConnector: Connector = {
  ...unsupportedLiveConnector(GOOGLE_CALENDAR_ID, "source.google-calendar"),
  enabled: true,
  async connect() {
    return;
  },
  async sync() {
    return { connectorId: GOOGLE_CALENDAR_ID, items: [] };
  },
};
