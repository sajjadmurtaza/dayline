import type { Clock } from "@/lib/clock";
import { iso, minutesBetween } from "@/lib/clock";
import type { CalendarEvent, Item, StoreDocument, Task } from "@/lib/types";
import { isEvent, isTask } from "@/lib/types";
import { freeRanges, unscheduledTasks, type TimeRange } from "@/domains/planning/engine";

export const MIN_ACTIONABLE_GAP_MINUTES = 20;

export const TIME_FACES = ["fixed", "yours", "proposed"] as const;
export type TimeFace = (typeof TIME_FACES)[number];

export const GAP_KINDS = ["workable", "transition", "too_short"] as const;
export type GapKind = (typeof GAP_KINDS)[number];

export type SuggestedEstimate = {
  minutes: number;
  confidence: "suggested";
};

export type PlacementProposal = {
  taskId: string;
  proposedPlacement: {
    startsAt: string;
    endsAt: string;
  };
};

export type UsableGap = TimeRange & { minutes: number; kind: GapKind };

export type PlacementCue = {
  task: Task;
  minutes: number;
  proposal: PlacementProposal;
};

export type EventShift = {
  doc: StoreDocument;
  reflow: PlacementProposal | null;
  from: { start: string; end: string };
  to: { start: string; end: string };
};

const FACE_CLASS: Record<TimeFace, string> = {
  fixed: "time-fixed",
  yours: "time-yours",
  proposed: "time-proposed",
};

export function isExternallyManagedEvent(event: CalendarEvent): boolean {
  return (
    event.source.kind === "connector" ||
    event.source.kind === "calendar-import" ||
    event.source.kind === "calendar-feed"
  );
}

export function showsCalendarIcon(event: CalendarEvent): boolean {
  return isExternallyManagedEvent(event);
}

export function canEditEvent(event: CalendarEvent): boolean {
  return event.source.kind === "local";
}

export function canDragEvent(event: CalendarEvent): boolean {
  return canEditEvent(event);
}

export function canResizeEvent(event: CalendarEvent): boolean {
  return canEditEvent(event);
}

export function canDeleteEvent(event: CalendarEvent): boolean {
  return canEditEvent(event);
}

export function isOnTimedSpine(event: CalendarEvent): boolean {
  return event.calendarPlacement !== "hidden" && event.calendarPlacement !== "quiet";
}

export function isReservedLunch(event: CalendarEvent): boolean {
  return event.source.kind === "local-rule" && event.source.rule === "lunch";
}

export function canMoveItem(item: Item): boolean {
  if (isEvent(item)) return false;
  return isTask(item);
}

export function timeFace(item: Item): TimeFace | null {
  if (isEvent(item)) return "fixed";
  if (isTask(item) && item.scheduledStart) return "yours";
  return null;
}

export function faceClass(face: TimeFace): string {
  return FACE_CLASS[face];
}

export function gapKind(minutes: number): GapKind {
  if (minutes < 10) return "too_short";
  if (minutes < MIN_ACTIONABLE_GAP_MINUTES) return "transition";
  return "workable";
}

export function getUsableGaps(doc: StoreDocument, day: Date): UsableGap[] {
  return freeRanges(day, doc.workingHours, doc.items.filter(isEvent)).map((range) => {
    const minutes = minutesBetween(range.start, range.end);
    return { ...range, minutes, kind: gapKind(minutes) };
  });
}

export function getUsableTimeToday(doc: StoreDocument, day: Date): number {
  return getUsableGaps(doc, day)
    .filter((gap) => gap.kind === "workable")
    .reduce((sum, gap) => sum + gap.minutes, 0);
}

function realMinutes(task: Task): number | null {
  return task.estimatedMinutes != null && task.estimatedMinutes > 0 ? task.estimatedMinutes : null;
}

export function placementCue(minutes: number, tasks: Task[], at: Date): PlacementCue | null {
  const unplaced = tasks.filter((task) => realMinutes(task) != null);
  if (unplaced.length === 0) return null;
  const shortest = Math.min(...unplaced.map((task) => realMinutes(task) ?? minutes));
  const threshold = Math.max(MIN_ACTIONABLE_GAP_MINUTES, shortest);
  if (minutes < threshold) return null;
  const task = unplaced.find((item) => (realMinutes(item) ?? minutes) <= minutes);
  if (!task || realMinutes(task) == null) return null;
  const need = realMinutes(task)!;
  return {
    task,
    minutes,
    proposal: {
      taskId: task.id,
      proposedPlacement: {
        startsAt: at.toISOString(),
        endsAt: new Date(at.getTime() + need * 60_000).toISOString(),
      },
    },
  };
}

export function cancellationCue(doc: StoreDocument, gainedMinutes: number, at: Date): PlacementCue | null {
  return placementCue(gainedMinutes, unscheduledTasks(doc), at);
}

export function cueForToday(doc: StoreDocument, day: Date): PlacementCue | null {
  for (const gap of getUsableGaps(doc, day)) {
    if (gap.kind !== "workable") continue;
    const cue = placementCue(gap.minutes, unscheduledTasks(doc), gap.start);
    if (cue) return cue;
  }
  return null;
}

export function suggestedEstimate(task: Task): SuggestedEstimate | null {
  if (task.estimatedMinutes != null) return null;
  return { minutes: 25, confidence: "suggested" };
}

export function acceptSuggestedEstimate(
  doc: StoreDocument,
  taskId: string,
  estimate: SuggestedEstimate,
  clock: Clock,
): StoreDocument {
  return {
    ...doc,
    items: doc.items.map((item) => {
      if (item.id !== taskId || !isTask(item)) return item;
      return { ...item, estimatedMinutes: estimate.minutes, updatedAt: iso(clock.now()) };
    }),
  };
}

export function acceptPlacement(
  doc: StoreDocument,
  proposal: PlacementProposal,
  clock: Clock,
): StoreDocument {
  return {
    ...doc,
    items: doc.items.map((item) => {
      if (item.id !== proposal.taskId || !isTask(item)) return item;
      return {
        ...item,
        status: item.status === "inbox" ? "planned" : item.status,
        scheduledStart: proposal.proposedPlacement.startsAt,
        scheduledEnd: proposal.proposedPlacement.endsAt,
        updatedAt: iso(clock.now()),
      };
    }),
  };
}

export function dismissPlacement(doc: StoreDocument, proposal: PlacementProposal): StoreDocument {
  return doc.items.some((item) => item.id === proposal.taskId) ? doc : doc;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function shiftFixedEvent(
  doc: StoreDocument,
  eventId: string,
  toStart: Date,
  toEnd: Date,
): EventShift | null {
  const event = doc.items.filter(isEvent).find((item) => item.id === eventId);
  if (!event) return null;
  const from = { start: event.start, end: event.end };
  const to = { start: toStart.toISOString(), end: toEnd.toISOString() };
  const next: StoreDocument = {
    ...doc,
    items: doc.items.map((item) =>
      item.id === eventId && isEvent(item) ? { ...item, start: to.start, end: to.end } : item,
    ),
  };
  const hit = next.items.find((item) => {
    if (!isTask(item) || !item.scheduledStart || !item.scheduledEnd) return false;
    if (item.status === "cancelled" || item.status === "completed") return false;
    return overlaps(
      new Date(item.scheduledStart).getTime(),
      new Date(item.scheduledEnd).getTime(),
      toStart.getTime(),
      toEnd.getTime(),
    );
  });
  const reflow =
    hit && isTask(hit) && hit.scheduledStart && hit.scheduledEnd
      ? {
          taskId: hit.id,
          proposedPlacement: {
            startsAt: to.end,
            endsAt: new Date(
              toEnd.getTime() +
                (new Date(hit.scheduledEnd).getTime() - new Date(hit.scheduledStart).getTime()),
            ).toISOString(),
          },
        }
      : null;
  return { doc: next, reflow, from, to };
}

export function cancelFixedEvent(
  doc: StoreDocument,
  eventId: string,
): { doc: StoreDocument; title: string | null; cue: PlacementCue | null } {
  const event = doc.items.filter(isEvent).find((item) => item.id === eventId);
  if (!event) return { doc, title: null, cue: null };
  const gained = minutesBetween(new Date(event.start), new Date(event.end));
  const next = { ...doc, items: doc.items.filter((item) => item.id !== eventId) };
  return {
    doc: next,
    title: event.title,
    cue: cancellationCue(next, gained, new Date(event.start)),
  };
}
