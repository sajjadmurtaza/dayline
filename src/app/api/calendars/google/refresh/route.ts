import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !secret) {
    return NextResponse.json({ error: "needs-config" }, { status: 503 });
  }
  const body = (await request.json()) as { refreshToken?: string };
  if (!body.refreshToken) return NextResponse.json({ error: "missing" }, { status: 400 });
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      refresh_token: body.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) return NextResponse.json({ error: "denied" }, { status: 401 });
  const token = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  if (!token.access_token) return NextResponse.json({ error: "denied" }, { status: 401 });
  return NextResponse.json({
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  });
}
