import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleOAuthUrl } from "@/domains/connectors/google-calendar";
import { SUPPORTED_LOCALES } from "@/i18n/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("locale") ?? "en";
  const locale = SUPPORTED_LOCALES.includes(requested as (typeof SUPPORTED_LOCALES)[number]) ? requested : "en";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !secret) {
    return NextResponse.redirect(new URL(`/${locale}/calendars?google=needs-config`, url.origin));
  }
  const state = randomBytes(16).toString("hex");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? new URL("/api/calendars/google/callback", url.origin).toString();
  const response = NextResponse.redirect(googleOAuthUrl({ clientId, redirectUri, state }));
  response.cookies.set("dayline_google_oauth", `${state}.${locale}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 600,
  });
  return response;
}
