import type { ParsedCalendarEvent } from "@/domains/calendars/ics";

export type GoogleCalendarListItem = { id: string; name: string };

export type GoogleApiEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  organizer?: { email?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
  eventType?: string;
  htmlLink?: string;
};

const READ_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function googleReadScope(): string {
  return READ_SCOPE;
}

export function mapGoogleEvent(
  item: GoogleApiEvent,
  calendar: GoogleCalendarListItem,
): ParsedCalendarEvent | null {
  const uid = item.id;
  const startRaw = item.start?.dateTime ?? item.start?.date;
  const endRaw = item.end?.dateTime ?? item.end?.date;
  if (!uid || !startRaw || !endRaw) return null;
  const allDay = Boolean(item.start?.date && !item.start.dateTime);
  const self = item.attendees?.find((person) => person.self);
  const response = (self?.responseStatus ?? "accepted").toLowerCase();
  const participation =
    response === "declined"
      ? "declined"
      : response === "tentative"
        ? "tentative"
        : response === "needsaction"
          ? "needsAction"
          : "accepted";
  const statusRaw = (item.status ?? "confirmed").toLowerCase();
  const categories = item.eventType === "birthday" ? ["birthday"] : [];
  return {
    uid,
    recurrenceId: null,
    title: item.summary ?? "Untitled",
    start: allDay ? new Date(`${startRaw}T00:00:00`).toISOString() : new Date(startRaw).toISOString(),
    end: allDay ? new Date(`${endRaw}T00:00:00`).toISOString() : new Date(endRaw).toISOString(),
    location: item.location ?? null,
    description: "",
    organizer: item.organizer?.email ?? null,
    status: statusRaw === "cancelled" ? "cancelled" : statusRaw === "tentative" ? "tentative" : "confirmed",
    participation,
    allDay,
    categories,
    calendarName: calendar.name,
    sourceUrl: item.htmlLink ?? null,
  };
}

export function selectedOnly<T extends { calendarId: string }>(items: T[], selected: string[]): T[] {
  const allow = new Set(selected);
  return items.filter((item) => allow.has(item.calendarId));
}
