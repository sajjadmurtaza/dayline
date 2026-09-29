import { importWindow } from "@/domains/calendars/window";
import { parseIcs, type ParsedCalendarEvent } from "@/domains/calendars/ics";
import { mapGoogleEvent, type GoogleApiEvent, type GoogleCalendarListItem } from "@/domains/calendars/google";
import type { GoogleConnection } from "@/lib/types";

export async function loadFeed(url: string, now: Date): Promise<ParsedCalendarEvent[] | null> {
  try {
    const response = await fetch("/api/calendars/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { text?: string };
    if (!body.text) return null;
    const parsed = parseIcs(body.text, now);
    return parsed.ok ? parsed.events : null;
  } catch {
    return null;
  }
}

export async function loadGoogleBatches(
  connection: GoogleConnection,
  now: Date,
): Promise<{ calendarId: string; events: ParsedCalendarEvent[] }[] | null> {
  try {
    const token = await freshToken(connection);
    if (!token) return null;
    const range = importWindow(now);
    const batches: { calendarId: string; events: ParsedCalendarEvent[] }[] = [];
    for (const calendarId of connection.selectedCalendarIds) {
      const calendar = connection.calendars.find((item) => item.id === calendarId);
      if (!calendar) continue;
      batches.push({ calendarId: calendar.id, events: await fetchGoogleEvents(token, calendar, range.start, range.end) });
    }
    return batches;
  } catch {
    return null;
  }
}

export async function freshToken(connection: GoogleConnection): Promise<string | null> {
  if (connection.expiresAt > Date.now() + 30_000) return connection.accessToken;
  if (!connection.refreshToken) return null;
  const response = await fetch("/api/calendars/google/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: connection.refreshToken }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { accessToken?: string };
  return body.accessToken ?? null;
}

export async function fetchCalendarList(token: string): Promise<GoogleCalendarListItem[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("list");
  const body = (await response.json()) as { items?: Array<{ id: string; summary?: string }> };
  return (body.items ?? []).map((item) => ({ id: item.id, name: item.summary ?? item.id }));
}

async function fetchGoogleEvents(
  token: string,
  calendar: GoogleCalendarListItem,
  start: Date,
  end: Date,
): Promise<ParsedCalendarEvent[]> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", start.toISOString());
  url.searchParams.set("timeMax", end.toISOString());
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("events");
  const body = (await response.json()) as { items?: GoogleApiEvent[] };
  return (body.items ?? []).flatMap((item) => {
    const mapped = mapGoogleEvent(item, calendar);
    return mapped ? [mapped] : [];
  });
}
