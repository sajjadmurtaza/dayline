import { NextResponse } from "next/server";
import { normalizeFeedUrl } from "@/domains/calendars/url";

function blockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  const classified = normalizeFeedUrl(body.url ?? "");
  if (classified.kind === "invalid") return NextResponse.json({ error: "not-ics" }, { status: 400 });
  if (classified.kind === "google-page") return NextResponse.json({ error: "google-page" }, { status: 400 });
  const target = new URL(classified.url);
  if (blockedHost(target.hostname)) return NextResponse.json({ error: "not-ics" }, { status: 400 });
  try {
    const response = await fetch(classified.url, { redirect: "follow" });
    const text = await response.text();
    if (!response.ok || !/BEGIN:VCALENDAR/i.test(text)) {
      return NextResponse.json({ error: "not-ics" }, { status: 422 });
    }
    return NextResponse.json({ text, url: classified.url });
  } catch {
    return NextResponse.json({ error: "not-ics" }, { status: 422 });
  }
}
