import { createId } from "@/lib/id";
import { iso, type Clock } from "@/lib/clock";
import type { CalendarEvent, ItemSource, StoreDocument } from "@/lib/types";
import { isEvent, isTask } from "@/lib/types";
import type { ParsedCalendarEvent } from "@/domains/calendars/ics";
import { importWindow } from "@/domains/calendars/window";
import { cancelFixedEvent, shiftFixedEvent, type EventShift, type PlacementCue } from "@/domains/planning/time-kinds";

export type CalendarPlacement = "spine" | "quiet" | "hidden";

export function classifyPlacement(event: {
  title: string;
  status: string;
  participation: string;
  allDay: boolean;
  categories: string[];
}): CalendarPlacement {
  const categories = event.categories.map((item) => item.toLowerCase());
  const title = event.title.toLowerCase();
  if (event.status === "cancelled" || event.participation === "declined") return "hidden";
  if (categories.includes("birthday") || title.includes("birthday")) return "hidden";
  if (event.allDay && (categories.includes("holiday") || title.includes("holiday"))) return "quiet";
  if (event.allDay) return "hidden";
  return "spine";
}

export function externalIdentity(source: ItemSource): string | null {
  if (source.kind === "connector") return `connector:${source.connectorId}:${source.calendarId ?? ""}:${source.externalId}`;
  if (source.kind === "calendar-import") return `file:${source.importId}:${source.externalId}`;
  if (source.kind === "calendar-feed") return `feed:${source.feedId}:${source.externalId}`;
  return null;
}

export function externalInstanceId(event: Pick<ParsedCalendarEvent, "uid" | "recurrenceId">): string {
  return event.recurrenceId ? `${event.uid}#${event.recurrenceId}` : event.uid;
}

function fingerprint(event: { title: string; start: string; end: string; organizer?: string | null }): string | null {
  if (!event.organizer) return null;
  return `${event.title.trim().toLowerCase()}|${event.start}|${event.end}|${event.organizer.trim().toLowerCase()}`;
}

function toStored(
  event: ParsedCalendarEvent,
  source: ItemSource,
  clock: Clock,
): CalendarEvent {
  const now = iso(clock.now());
  const placement = classifyPlacement(event);
  return {
    id: createId(),
    kind: "event",
    title: event.title,
    createdAt: now,
    updatedAt: now,
    projectId: null,
    areaId: null,
    tags: [],
    source,
    start: event.start,
    end: event.end,
    location: event.location,
    conferenceUrl: null,
    description: event.description,
    flexibility: "fixed",
    participation: event.participation,
    allDay: event.allDay,
    calendarPlacement: placement,
    calendarName: event.calendarName,
    organizer: event.organizer,
    sourceUrl: event.sourceUrl ?? undefined,
  };
}

export type ApplyResult = {
  doc: StoreDocument;
  shifts: EventShift[];
  opened: { title: string; cue: PlacementCue } | null;
};

function upsertEvents(doc: StoreDocument, incoming: CalendarEvent[], clock: Clock): ApplyResult {
  let next = doc;
  const shifts: EventShift[] = [];
  let opened: ApplyResult["opened"] = null;
  const seenFingerprints = new Map<string, string>();
  for (const item of next.items) {
    if (!isEvent(item)) continue;
    const print = fingerprint(item);
    if (print) seenFingerprints.set(print, item.id);
  }

  for (const event of incoming) {
    const key = externalIdentity(event.source);
    const existing = next.items.find((item) => isEvent(item) && externalIdentity(item.source) === key);
    if (existing && isEvent(existing)) {
      if (event.calendarPlacement === "hidden" && existing.calendarPlacement !== "hidden") {
        const cancelled = cancelFixedEvent(next, existing.id);
        next = cancelled.doc;
        if (!opened && cancelled.cue && cancelled.title) opened = { title: cancelled.title, cue: cancelled.cue };
        continue;
      }
      if (existing.start !== event.start || existing.end !== event.end) {
        const shifted = shiftFixedEvent(next, existing.id, new Date(event.start), new Date(event.end));
        if (shifted) {
          next = {
            ...shifted.doc,
            items: shifted.doc.items.map((item) =>
              item.id === existing.id && isEvent(item)
                ? {
                    ...item,
                    title: event.title,
                    location: event.location,
                    calendarName: event.calendarName,
                    calendarPlacement: event.calendarPlacement,
                    participation: event.participation,
                    sourceUrl: event.sourceUrl,
                    updatedAt: iso(clock.now()),
                  }
                : item,
            ),
          };
          if (shifted.reflow) shifts.push(shifted);
        }
      }
      continue;
    }
    const print = fingerprint(event);
    if (print && seenFingerprints.has(print)) continue;
    next = { ...next, items: [...next.items, event] };
    if (print) seenFingerprints.set(print, event.id);
  }
  return { doc: next, shifts, opened };
}

export function sourceForFile(importId: string, externalId: string): ItemSource {
  return { kind: "calendar-import", importer: "ics-file", externalId, importId };
}

export function sourceForFeed(feedId: string, externalId: string): ItemSource {
  return { kind: "calendar-feed", feedId, externalId };
}

export function sourceForGoogle(externalId: string, calendarId: string): ItemSource {
  return { kind: "connector", connectorId: "google-calendar", externalId, calendarId };
}

export function commitParsedEvents(
  doc: StoreDocument,
  events: ParsedCalendarEvent[],
  sourceFor: (externalId: string) => ItemSource,
  clock: Clock,
): ApplyResult {
  const incoming = events.map((event) => toStored(event, sourceFor(externalInstanceId(event)), clock));
  return upsertEvents(doc, incoming, clock);
}

export function applyWindow(
  doc: StoreDocument,
  events: ParsedCalendarEvent[],
  sourceFor: (externalId: string) => ItemSource,
  belongs: (source: ItemSource) => boolean,
  clock: Clock,
): ApplyResult {
  const applied = commitParsedEvents(doc, events, sourceFor, clock);
  const kept = new Set(events.map(externalInstanceId));
  const window = importWindow(clock.now());
  let next = applied.doc;
  let opened = applied.opened;
  const gone = next.items.filter(
    (item) => isEvent(item) && belongs(item.source) && "externalId" in item.source && !kept.has(item.source.externalId),
  );
  for (const event of gone) {
    if (!isEvent(event) || event.calendarPlacement === "hidden") continue;
    const start = new Date(event.start).getTime();
    const stillInWindow = start >= window.start.getTime() && start < window.end.getTime();
    if (!stillInWindow) continue;
    const cancelled = cancelFixedEvent(next, event.id);
    next = cancelled.doc;
    if (!opened && cancelled.cue && cancelled.title) opened = { title: cancelled.title, cue: cancelled.cue };
  }
  next = {
    ...next,
    items: next.items.filter((item) => {
      if (!isEvent(item) || !belongs(item.source) || !("externalId" in item.source)) return true;
      return kept.has(item.source.externalId);
    }),
  };
  return { doc: next, shifts: applied.shifts, opened };
}

export function removeImportedSource(
  doc: StoreDocument,
  match: (source: ItemSource) => boolean,
): StoreDocument {
  return {
    ...doc,
    items: doc.items.filter((item) => (isEvent(item) ? !match(item.source) : true)),
  };
}

export function removeCalendarFile(doc: StoreDocument, importId: string): StoreDocument {
  const next = removeImportedSource(
    doc,
    (source) => source.kind === "calendar-import" && source.importId === importId,
  );
  return { ...next, calendarFiles: next.calendarFiles.filter((file) => file.id !== importId) };
}

export function removeCalendarFeed(doc: StoreDocument, feedId: string): StoreDocument {
  const next = removeImportedSource(doc, (source) => source.kind === "calendar-feed" && source.feedId === feedId);
  return { ...next, calendarFeeds: next.calendarFeeds.filter((feed) => feed.id !== feedId) };
}

export function disconnectGoogle(doc: StoreDocument): StoreDocument {
  const next = removeImportedSource(
    doc,
    (source) => source.kind === "connector" && source.connectorId === "google-calendar",
  );
  return { ...next, googleConnection: null };
}

export function setSelectedGoogleCalendars(doc: StoreDocument, ids: string[]): StoreDocument {
  if (!doc.googleConnection) return doc;
  return {
    ...doc,
    googleConnection: { ...doc.googleConnection, selectedCalendarIds: ids, lastError: null },
    items: doc.items.filter((item) => {
      if (!isEvent(item) || item.source.kind !== "connector" || item.source.connectorId !== "google-calendar") {
        return true;
      }
      return !item.source.calendarId || ids.includes(item.source.calendarId);
    }),
  };
}

export function markGoogleSyncFailure(doc: StoreDocument, message: string): StoreDocument {
  if (!doc.googleConnection) return doc;
  return { ...doc, googleConnection: { ...doc.googleConnection, lastError: message } };
}

export function rememberedFile(
  doc: StoreDocument,
  file: { id: string; filename: string; name: string; eventCount: number },
  clock: Clock,
): StoreDocument {
  return {
    ...doc,
    calendarFiles: [
      ...doc.calendarFiles.filter((item) => item.id !== file.id),
      { ...file, importedAt: clock.now().getTime() },
    ],
  };
}

export function rememberedFeed(
  doc: StoreDocument,
  feed: { id: string; url: string; name: string; secret?: boolean },
  clock: Clock,
  error: string | null = null,
): StoreDocument {
  const previous = doc.calendarFeeds.find((item) => item.id === feed.id);
  return {
    ...doc,
    calendarFeeds: [
      ...doc.calendarFeeds.filter((item) => item.id !== feed.id),
      {
        id: feed.id,
        url: feed.url,
        name: feed.name,
        secret: feed.secret ?? previous?.secret ?? false,
        lastSyncedAt: error ? (previous?.lastSyncedAt ?? null) : clock.now().getTime(),
        lastError: error,
      },
    ],
  };
}

export function privatePrepTask(doc: StoreDocument, eventId: string, clock: Clock): StoreDocument {
  const event = doc.items.find((item) => item.id === eventId && isEvent(item));
  if (!event || !isEvent(event)) return doc;
  const start = new Date(new Date(event.start).getTime() - 15 * 60_000);
  const end = new Date(event.start);
  const task = {
    id: createId(),
    kind: "task" as const,
    title: `Prepare: ${event.title}`,
    createdAt: iso(clock.now()),
    updatedAt: iso(clock.now()),
    projectId: null,
    areaId: event.areaId,
    tags: [],
    source: { kind: "local" as const },
    status: "planned" as const,
    estimatedMinutes: 15,
    actualMinutes: 0,
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
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
  return { ...doc, items: [...doc.items, task] };
}

export function taskCount(doc: StoreDocument): number {
  return doc.items.filter(isTask).length;
}
