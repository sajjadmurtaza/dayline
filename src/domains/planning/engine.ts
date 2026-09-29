import type { CalendarEvent, StoreDocument, Task, WorkingHours } from "@/lib/types";
import { isEvent, isTask } from "@/lib/types";
import { addDays, atTime, minutesBetween, startOfDay } from "@/lib/clock";

export type TimeRange = { start: Date; end: Date };

export type PlanMove = {
  taskId: string;
  scheduledStart: string;
  scheduledEnd: string;
  reason: "free_block";
};

export type PlanProposal = {
  moves: PlanMove[];
};

export type NowAdvice =
  | { kind: "busy"; event: CalendarEvent }
  | { kind: "running"; task: Task }
  | { kind: "suggest"; task: Task; minutesFree: number; nextTitle: string | null };

export function eventsOnDay(doc: StoreDocument, day: Date): CalendarEvent[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return doc.items.filter(isEvent).filter((event) => {
    if (event.calendarPlacement === "hidden" || event.calendarPlacement === "quiet") return false;
    const t = new Date(event.start).getTime();
    return t >= start && t < end;
  });
}

export function tasksOnDay(doc: StoreDocument, day: Date): Task[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return doc.items.filter(isTask).filter((task) => {
    if (!task.scheduledStart) return false;
    const t = new Date(task.scheduledStart).getTime();
    return t >= start && t < end && task.status !== "cancelled";
  });
}

export function unscheduledTasks(doc: StoreDocument): Task[] {
  return doc.items
    .filter(isTask)
    .filter(
      (task) =>
        !task.sometime &&
        !task.scheduledStart &&
        task.status !== "completed" &&
        task.status !== "cancelled" &&
        !task.waitingFor,
    );
}

function toDate(day: Date, minutes: number): Date {
  return atTime(day, Math.floor(minutes / 60), minutes % 60);
}

export function detectConflicts(events: CalendarEvent[]): Array<[CalendarEvent, CalendarEvent]> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const pairs: Array<[CalendarEvent, CalendarEvent]> = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (new Date(sorted[i].end).getTime() > new Date(sorted[i + 1].start).getTime()) {
      pairs.push([sorted[i], sorted[i + 1]]);
    }
  }
  return pairs;
}

export function freeRanges(day: Date, hours: WorkingHours, events: CalendarEvent[]): TimeRange[] {
  const occupied: TimeRange[] = [
    { start: toDate(day, hours.lunchStartMinutes), end: toDate(day, hours.lunchEndMinutes) },
    ...events.map((event) => ({ start: new Date(event.start), end: new Date(event.end) })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const ranges: TimeRange[] = [];
  let cursor = toDate(day, hours.startMinutes);
  const close = toDate(day, hours.endMinutes);

  for (const block of occupied) {
    if (block.end <= cursor) continue;
    if (block.start > cursor) {
      ranges.push({ start: cursor, end: block.start < close ? block.start : close });
    }
    if (block.end > cursor) cursor = block.end;
    if (cursor >= close) break;
  }
  if (cursor < close) ranges.push({ start: cursor, end: close });
  return ranges.filter((range) => minutesBetween(range.start, range.end) >= 5);
}

const PRIORITY_RANK: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function proposeDayPlan(doc: StoreDocument, day: Date): PlanProposal {
  const events = eventsOnDay(doc, day);
  const open = freeRanges(day, doc.workingHours, events);
  const queue = unscheduledTasks(doc)
    .filter(
      (task) => task.status === "inbox" || task.status === "ready" || task.status === "planned",
    )
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const moves: PlanMove[] = [];
  const remaining = open.map((range) => ({ ...range }));

  for (const task of queue) {
    const need = task.estimatedMinutes ?? 30;
    const slot = remaining.find((range) => minutesBetween(range.start, range.end) >= need);
    if (!slot) continue;
    const start = slot.start;
    const end = new Date(start.getTime() + need * 60000);
    moves.push({
      taskId: task.id,
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      reason: "free_block",
    });
    slot.start = end;
  }

  return { moves };
}

export function adviceNow(doc: StoreDocument, now: Date): NowAdvice | null {
  const running = doc.items.filter(isTask).find((task) => task.status === "running");
  if (running) return { kind: "running", task: running };

  const events = eventsOnDay(doc, now).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const current = events.find((event) => new Date(event.start) <= now && new Date(event.end) > now);
  if (current) return { kind: "busy", event: current };

  const next = events.find((event) => new Date(event.start) > now);
  const minutesFree = next ? minutesBetween(now, new Date(next.start)) : 120;
  const candidates = [
    ...tasksOnDay(doc, now).filter((task) => task.status !== "completed"),
    ...unscheduledTasks(doc),
  ].filter((task) => task.status !== "running");
  const fit = candidates
    .filter((task) => !task.estimatedMinutes || task.estimatedMinutes <= minutesFree)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
  if (!fit) return null;
  return {
    kind: "suggest",
    task: fit,
    minutesFree,
    nextTitle: next?.title ?? null,
  };
}

export function fitsInMinutes(task: Task, minutes: number): boolean {
  if (!task.estimatedMinutes) return minutes >= 10;
  return task.estimatedMinutes <= minutes;
}
