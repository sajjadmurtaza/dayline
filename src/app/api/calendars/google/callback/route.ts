import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") ?? "";
  const stored = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("dayline_google_oauth="))
    ?.slice("dayline_google_oauth=".length);
  const [expected, locale = "en"] = decodeURIComponent(stored ?? "").split(".");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/${locale}/calendars?google=${reason}`, origin));
  if (!expected || state !== expected || !code) return fail("denied");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !secret) return fail("needs-config");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/calendars/google/callback", origin).toString();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: secret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenResponse.ok) return fail("denied");
  const token = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!token.access_token) return fail("denied");
  const payload = Buffer.from(
    JSON.stringify({
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    }),
  ).toString("base64url");
  const response = NextResponse.redirect(new URL(`/${locale}/calendars#google=${payload}`, origin));
  response.cookies.set("dayline_google_oauth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
