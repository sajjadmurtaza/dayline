import { describe, expect, it } from "vitest";
import {
  classifyPlacement,
  applyWindow,
  commitParsedEvents,
  disconnectGoogle,
  markGoogleSyncFailure,
  rememberedFeed,
  rememberedFile,
  removeCalendarFile,
  setSelectedGoogleCalendars,
  sourceForFeed,
  sourceForFile,
  sourceForGoogle,
} from "@/domains/calendars/apply";
import { parseIcs, wallTimeToDate } from "@/domains/calendars/ics";
import { mapGoogleEvent, selectedOnly } from "@/domains/calendars/google";
import { displayFeedUrl, normalizeFeedUrl } from "@/domains/calendars/url";
import { importWindow } from "@/domains/calendars/window";
import { eventsOnDay, detectConflicts } from "@/domains/planning/engine";
import { acceptPlacement, canMoveItem, dismissPlacement, showsCalendarIcon } from "@/domains/planning/time-kinds";
import { emptyStore, parseStore } from "@/lib/store/repository";
import { isEvent, isTask, type CalendarEvent, type StoreDocument } from "@/lib/types";

const now = new Date("2026-09-29T10:00:00");
const clock = { now: () => now };

const calendar = `BEGIN:VCALENDAR
X-WR-CALNAME:Work Calendar
BEGIN:VEVENT
UID:fixed-1
DTSTART:20260929T100000Z
DTEND:20260929T110000Z
SUMMARY:Standup
LOCATION:Room 2
ORGANIZER:mailto:lead@example.com
END:VEVENT
BEGIN:VEVENT
UID:daily
DTSTART:20260928T090000Z
DTEND:20260928T093000Z
RRULE:FREQ=DAILY;COUNT=4
SUMMARY:Daily
END:VEVENT
BEGIN:VEVENT
UID:tokyo
DTSTART;TZID=Asia/Tokyo:20260929T100000
DTEND;TZID=Asia/Tokyo:20260929T110000
SUMMARY:Tokyo
END:VEVENT
BEGIN:VEVENT
UID:gone
STATUS:CANCELLED
DTSTART:20260929T120000Z
DTEND:20260929T130000Z
SUMMARY:Cancelled meeting
END:VEVENT
BEGIN:VEVENT
UID:holiday
DTSTART;VALUE=DATE:20260929
DTEND;VALUE=DATE:20260930
SUMMARY:Holiday
CATEGORIES:HOLIDAY
END:VEVENT
END:VCALENDAR`;

function doc(items: StoreDocument["items"] = []): StoreDocument {
  return { ...emptyStore(), items, seeded: true };
}

describe("calendar import", () => {
  it("parses an ics file into fixed events and keeps the UID", () => {
    const parsed = parseIcs(calendar, now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const standup = parsed.events.find((event) => event.uid === "fixed-1");
    expect(standup?.title).toBe("Standup");
    const stored = commitParsedEvents(doc(), parsed.events, (id) => sourceForFile("file-1", id), clock);
    const event = stored.doc.items.find((item) => isEvent(item) && item.title === "Standup");
    expect(event && isEvent(event) && event.flexibility).toBe("fixed");
    expect(event && isEvent(event) && event.source).toMatchObject({ externalId: "fixed-1", importer: "ics-file" });
    expect(canMoveItem(event!)).toBe(false);
    expect(showsCalendarIcon(event as CalendarEvent)).toBe(true);
  });

  it("expands a daily recurrence inside the active window", () => {
    const parsed = parseIcs(calendar, now);
    if (!parsed.ok) throw new Error("ics");
    const daily = parsed.events.filter((event) => event.uid === "daily");
    expect(daily.length).toBeGreaterThan(1);
    const window = importWindow(now);
    expect(window.end.getTime() - window.start.getTime()).toBe(7 * 86_400_000);
    expect(daily.every((event) => event.start >= window.start.toISOString() && event.start < window.end.toISOString())).toBe(true);
  });

  it("keeps a timezone wall time off UTC", () => {
    const tokyo = wallTimeToDate("20260929T100000", "Asia/Tokyo", false);
    expect(tokyo?.toISOString()).toBe("2026-09-29T01:00:00.000Z");
  });

  it("keeps cancelled and declined events off the spine", () => {
    expect(classifyPlacement({ title: "Gone", status: "cancelled", participation: "accepted", allDay: false, categories: [] })).toBe("hidden");
    expect(classifyPlacement({ title: "No", status: "confirmed", participation: "declined", allDay: false, categories: [] })).toBe("hidden");
    const declined = mapGoogleEvent(
      {
        id: "g-no",
        status: "confirmed",
        summary: "No",
        start: { dateTime: "2026-09-29T02:00:00Z" },
        end: { dateTime: "2026-09-29T03:00:00Z" },
        attendees: [{ self: true, responseStatus: "declined" }],
      },
      { id: "work", name: "Work" },
    );
    const stored = commitParsedEvents(doc(), [declined!], (id) => sourceForGoogle(id, "work"), clock);
    expect(eventsOnDay(stored.doc, now).some((event) => event.title === "No")).toBe(false);
  });

  it("imports only the selected google calendars", () => {
    const rows = [
      { calendarId: "work", title: "A" },
      { calendarId: "birthdays", title: "B" },
    ];
    expect(selectedOnly(rows, ["work"]).map((row) => row.title)).toEqual(["A"]);
  });

  it("does not give local lunch a calendar icon", () => {
    const lunch = {
      ...doc().items,
    };
    void lunch;
    const event = {
      id: "lunch",
      kind: "event" as const,
      title: "Lunch",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      projectId: null,
      areaId: null,
      tags: [],
      source: { kind: "local-rule" as const, rule: "lunch" as const },
      start: now.toISOString(),
      end: now.toISOString(),
      location: null,
      conferenceUrl: null,
      description: "",
      flexibility: "fixed" as const,
    };
    expect(showsCalendarIcon(event)).toBe(false);
  });

  it("updates the same external id and keeps a different id with the same title", () => {
    const first = parseIcs(calendar, now);
    if (!first.ok) throw new Error("ics");
    const once = commitParsedEvents(doc(), first.events, (id) => sourceForFile("file-1", id), clock);
    const moved = first.events.map((event) =>
      event.uid === "fixed-1" ? { ...event, start: "2026-09-29T05:00:00.000Z", end: "2026-09-29T06:00:00.000Z" } : event,
    );
    const twice = commitParsedEvents(once.doc, moved, (id) => sourceForFile("file-1", id), clock);
    const standups = twice.doc.items.filter((item) => isEvent(item) && item.title === "Standup");
    expect(standups).toHaveLength(1);
    expect(standups[0] && isEvent(standups[0]) && standups[0].start).toBe("2026-09-29T05:00:00.000Z");
    const other = commitParsedEvents(
      twice.doc,
      [{ ...first.events.find((event) => event.uid === "fixed-1")!, uid: "other-id" }],
      (id) => sourceForFile("file-2", id),
      clock,
    );
    expect(other.doc.items.filter((item) => isEvent(item) && item.title === "Standup")).toHaveLength(2);
  });

  it("keeps overlapping fixed events and proposes a reflow without moving the task", () => {
    const first = parseIcs(calendar, now);
    if (!first.ok) throw new Error("ics");
    const base = commitParsedEvents(doc(), first.events, (id) => sourceForFile("file-1", id), clock).doc;
    const task = {
      id: "proposal",
      kind: "task" as const,
      title: "Proposal",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      projectId: null,
      areaId: null,
      tags: [],
      source: { kind: "local" as const },
      status: "planned" as const,
      estimatedMinutes: 45,
      actualMinutes: 0,
      scheduledStart: "2026-09-29T05:00:00.000Z",
      scheduledEnd: "2026-09-29T05:45:00.000Z",
      deadline: null,
      deadlineKind: "none" as const,
      priority: "normal" as const,
      notes: "",
      parentTaskId: null,
      dependsOn: [],
      flexibility: "flexible" as const,
      interruptible: true,
      sometime: false,
      waitingFor: null,
    };
    const withTask = { ...base, items: [...base.items, task] };
    const moved = first.events.map((event) =>
      event.uid === "fixed-1" ? { ...event, start: "2026-09-29T05:00:00.000Z", end: "2026-09-29T05:45:00.000Z" } : event,
    );
    const applied = commitParsedEvents(withTask, moved, (id) => sourceForFile("file-1", id), clock);
    expect(applied.shifts[0]?.reflow?.taskId).toBe("proposal");
    const left = dismissPlacement(applied.doc, applied.shifts[0]!.reflow!);
    const kept = left.items.find((item) => item.id === "proposal");
    expect(isTask(kept!) && kept.scheduledStart).toBe(task.scheduledStart);
    const used = acceptPlacement(applied.doc, applied.shifts[0]!.reflow!, clock);
    expect(isTask(used.items.find((item) => item.id === "proposal")!) && used.items.find((item) => item.id === "proposal")).toBeTruthy();
    const pair = detectConflicts(eventsOnDay(withTask, now).concat(eventsOnDay(applied.doc, now)));
    expect(applied.doc.items.filter(isEvent).length).toBeGreaterThan(1);
    expect(pair).toBeDefined();
  });

  it("does not treat a google page as an ics feed and normalizes webcal", () => {
    expect(normalizeFeedUrl("https://calendar.google.com/calendar/u/0/r").kind).toBe("google-page");
    expect(normalizeFeedUrl("webcal://example.com/team.ics")).toEqual({
      kind: "ics",
      url: "https://example.com/team.ics",
      secret: false,
    });
    expect(normalizeFeedUrl("https://calendar.google.com/calendar/ical/a/public/basic.ics")).toMatchObject({
      kind: "ics",
      secret: false,
    });
    const secret = normalizeFeedUrl("https://calendar.google.com/calendar/ical/me%40example.com/private-abc/basic.ics");
    expect(secret).toMatchObject({ kind: "ics", secret: true });
    if (secret.kind === "ics") expect(displayFeedUrl(secret.url, true)).toBe("••••••••••••/basic.ics");
    expect(parseIcs("not a calendar", now)).toEqual({ ok: false, reason: "malformed" });
  });

  it("drops a missing uid after a successful refresh and keeps it when refresh fails", () => {
    const parsed = parseIcs(calendar, now);
    if (!parsed.ok) throw new Error("ics");
    const feedOf = (source: StoreDocument["items"][number]["source"]) => source.kind === "calendar-feed" && source.feedId === "feed-1";
    const first = applyWindow(doc(), parsed.events, (id) => sourceForFeed("feed-1", id), feedOf, clock);
    expect(first.doc.items.some((item) => isEvent(item) && item.title === "Standup")).toBe(true);
    const kept = parsed.events.filter((event) => event.uid !== "fixed-1");
    const refreshed = applyWindow(first.doc, kept, (id) => sourceForFeed("feed-1", id), feedOf, clock);
    expect(refreshed.doc.items.some((item) => isEvent(item) && item.title === "Standup")).toBe(false);
    const cached = rememberedFeed(first.doc, { id: "feed-1", url: "https://example.com/a.ics", name: "Work", secret: true }, clock, "offline");
    expect(cached.items.some((item) => isEvent(item) && item.title === "Standup")).toBe(true);
    expect(cached.calendarFeeds[0]?.secret).toBe(true);
    expect(cached.calendarFeeds[0]?.url).toBe("https://example.com/a.ics");
  });

  it("previews without writing, then persists, and removal keeps tasks", () => {
    const before = doc();
    const parsed = parseIcs(calendar, now);
    expect(parsed.ok).toBe(true);
    expect(before.items).toHaveLength(0);
    if (!parsed.ok) return;
    const applied = commitParsedEvents(before, parsed.events, (id) => sourceForFile("file-1", id), clock);
    const saved = rememberedFile(applied.doc, { id: "file-1", filename: "work.ics", name: "Work", eventCount: 3 }, clock);
    expect(saved.calendarFiles).toHaveLength(1);
    expect(saved.items.some(isEvent)).toBe(true);
    const withTask = {
      ...saved,
      items: [
        ...saved.items,
        {
          id: "task",
          kind: "task" as const,
          title: "Keep me",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          projectId: null,
          areaId: null,
          tags: [],
          source: { kind: "local" as const },
          status: "inbox" as const,
          estimatedMinutes: 25,
          actualMinutes: 0,
          scheduledStart: null,
          scheduledEnd: null,
          deadline: null,
          deadlineKind: "none" as const,
          priority: "normal" as const,
          notes: "",
          parentTaskId: null,
          dependsOn: [],
          flexibility: "flexible" as const,
          interruptible: true,
          sometime: false,
          waitingFor: null,
        },
      ],
    };
    const removed = removeCalendarFile(withTask, "file-1");
    expect(removed.items.some((item) => isEvent(item) && item.source.kind === "calendar-import")).toBe(false);
    expect(removed.items.some((item) => isTask(item) && item.title === "Keep me")).toBe(true);
    const cached = markGoogleSyncFailure(
      {
        ...removed,
        googleConnection: {
          accessToken: "a",
          refreshToken: null,
          expiresAt: 1,
          email: null,
          selectedCalendarIds: [],
          calendars: [],
          lastSyncedAt: 1,
          lastError: null,
        },
      },
      "Couldn't update Google Calendar.",
    );
    expect(cached.items).toEqual(removed.items);
  });

  it("keeps an existing dayline document when calendar fields are absent", () => {
    const legacy = {
      version: 1,
      items: [
        {
          id: "task",
          kind: "task",
          title: "Keep me",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          projectId: null,
          areaId: null,
          tags: [],
          source: { kind: "local" },
          status: "inbox",
          estimatedMinutes: 25,
          actualMinutes: 0,
          scheduledStart: null,
          scheduledEnd: null,
          deadline: null,
          deadlineKind: "none",
          priority: "normal",
          notes: "",
          parentTaskId: null,
          dependsOn: [],
          flexibility: "flexible",
          interruptible: true,
          sometime: false,
          waitingFor: null,
        },
      ],
      projects: [],
      sessions: [],
      workingHours: emptyStore().workingHours,
      undo: [],
      seeded: true,
    };
    const loaded = parseStore(JSON.stringify(legacy));
    expect(loaded.items[0]?.title).toBe("Keep me");
    expect(loaded.calendarFiles).toEqual([]);
    expect(loaded.googleConnection).toBeNull();
    const cleared = disconnectGoogle({
      ...loaded,
      googleConnection: {
        accessToken: "a",
        refreshToken: null,
        expiresAt: 1,
        email: null,
        selectedCalendarIds: ["work"],
        calendars: [{ id: "work", name: "Work" }],
        lastSyncedAt: null,
        lastError: null,
      },
      items: [
        ...loaded.items,
        {
          id: "meet",
          kind: "event",
          title: "Client call",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          projectId: null,
          areaId: null,
          tags: [],
          source: { kind: "connector", connectorId: "google-calendar", externalId: "g1", calendarId: "work" },
          start: now.toISOString(),
          end: now.toISOString(),
          location: null,
          conferenceUrl: null,
          description: "",
          flexibility: "fixed",
        },
      ],
    });
    expect(setSelectedGoogleCalendars(cleared, []).googleConnection).toBeNull();
    expect(cleared.items.some(isTask)).toBe(true);
    expect(cleared.items.some(isEvent)).toBe(false);
  });
});
