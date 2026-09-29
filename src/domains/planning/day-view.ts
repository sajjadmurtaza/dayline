import { addDays, minutesBetween, startOfDay } from "@/lib/clock";
import type { CalendarEvent, StoreDocument, Task } from "@/lib/types";
import { isTask } from "@/lib/types";
import {
  adviceNow,
  detectConflicts,
  eventsOnDay,
  tasksOnDay,
  unscheduledTasks,
  type NowAdvice,
} from "@/domains/planning/engine";
import { getUsableTimeToday } from "@/domains/planning/time-kinds";

export const TIME_BANDS = ["past", "now", "next", "later"] as const;
export type TimeBand = (typeof TIME_BANDS)[number];

export const GREETING_PERIODS = ["morning", "afternoon", "evening", "night"] as const;
export type GreetingPeriod = (typeof GREETING_PERIODS)[number];

export const COMPANION_STATES = [
  "idle",
  "thinking",
  "curious",
  "focused",
  "reminding",
  "warning",
  "celebrating",
  "resting",
] as const;
export type CompanionState = (typeof COMPANION_STATES)[number];

export const NOTICE_KINDS = ["conflict", "overrun", "upcoming", "unresolved"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const ATTENTION_PHASES = ["none", "ready", "waiting", "stillOpen"] as const;
export type AttentionPhase = (typeof ATTENTION_PHASES)[number];

export type TimedKind = "task" | "event";

export type TimedOccurrence = {
  id: string;
  kind: TimedKind;
  start: Date;
  end: Date;
  task: Task | null;
  event: CalendarEvent | null;
};

export type DayNotice = {
  id: string;
  kind: NoticeKind;
  companionState: CompanionState;
  messageKey: "conflict" | "overrun" | "upcoming" | "stillWantThis";
  title: string;
  itemId: string | null;
  timeLabel: string | null;
  minutes: number | null;
};

export type DaySnapshot = {
  greeting: GreetingPeriod;
  showEveningClose: boolean;
  showEveningSettled: boolean;
  nowOccurrence: TimedOccurrence | null;
  nextOccurrence: TimedOccurrence | null;
  minutesFree: number | null;
  usableMinutes: number;
  externalCalendar: boolean;
  unfinished: Task[];
  completedToday: Task[];
  advice: NowAdvice | null;
  notice: DayNotice | null;
  bands: Record<string, TimeBand>;
  attention: Record<string, AttentionPhase>;
};

const OPEN_MINUTES = 120;
const UPCOMING_MINUTES = 15;
const READY_MINUTES = 4;
const OPEN_STATUSES = new Set(["inbox", "planned", "ready", "paused"]);

export function greetingPeriod(now: Date): GreetingPeriod {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function itemWindow(item: Task | CalendarEvent): { start: Date; end: Date } | null {
  if (item.kind === "event") {
    return { start: new Date(item.start), end: new Date(item.end) };
  }
  if (!item.scheduledStart) return null;
  const start = new Date(item.scheduledStart);
  const end = item.scheduledEnd
    ? new Date(item.scheduledEnd)
    : new Date(start.getTime() + (item.estimatedMinutes ?? 30) * 60_000);
  return { start, end };
}

export function occurrencesOnDay(doc: StoreDocument, day: Date): TimedOccurrence[] {
  const events = eventsOnDay(doc, day).map((event) => ({
    id: event.id,
    kind: "event" as const,
    start: new Date(event.start),
    end: new Date(event.end),
    task: null,
    event,
  }));
  const tasks = tasksOnDay(doc, day).flatMap((task) => {
    const window = itemWindow(task);
    if (!window) return [];
    return [
      {
        id: task.id,
        kind: "task" as const,
        start: window.start,
        end: window.end,
        task,
        event: null,
      },
    ];
  });
  return [...events, ...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function completedTasksOnDay(doc: StoreDocument, day: Date): Task[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return doc.items.filter(isTask).filter((task) => {
    if (task.status !== "completed") return false;
    const updated = new Date(task.updatedAt).getTime();
    return updated >= start && updated < end;
  });
}

export function unfinishedTasks(doc: StoreDocument, day: Date): Task[] {
  const open = new Set(["inbox", "planned", "ready", "running", "paused"]);
  const seen = new Set<string>();
  const list: Task[] = [];
  const extra = doc.items
    .filter(isTask)
    .filter((task) => task.status === "running" || task.status === "paused");
  for (const task of [...tasksOnDay(doc, day), ...unscheduledTasks(doc), ...extra]) {
    if (!open.has(task.status) || seen.has(task.id)) continue;
    seen.add(task.id);
    list.push(task);
  }
  return list;
}

export function attentionFor(occurrence: TimedOccurrence, now: Date): AttentionPhase {
  const task = occurrence.task;
  if (occurrence.kind === "event" || !task) return "none";
  if (!OPEN_STATUSES.has(task.status)) return "none";
  if (now < occurrence.start) return "none";
  const afterStart = minutesBetween(occurrence.start, now);
  if (now < occurrence.end) return afterStart <= READY_MINUTES ? "ready" : "waiting";
  return "stillOpen";
}

export type CalendarTaskState = "completed" | "cancelled" | "unresolved" | "scheduled";

export function calendarTaskState(task: Task, end: Date, now: Date): CalendarTaskState {
  if (task.status === "completed") return "completed";
  if (task.status === "cancelled") return "cancelled";
  if (OPEN_STATUSES.has(task.status) && end <= now) return "unresolved";
  return "scheduled";
}

export type DayMood = "today" | "resolved" | "unresolved";

export function dayMood(doc: StoreDocument, day: Date, now: Date): DayMood {
  if (startOfDay(day).getTime() === startOfDay(now).getTime()) return "today";
  const items = occurrencesOnDay(doc, day).filter((item) => item.kind === "task" && item.task);
  if (
    items.some((item) => item.task && calendarTaskState(item.task, item.end, now) === "unresolved")
  ) {
    return "unresolved";
  }
  return "resolved";
}

function coveringNow(items: TimedOccurrence[], now: Date): TimedOccurrence | null {
  const covering = items.filter((item) => item.start <= now && item.end > now);
  return covering.find((item) => item.kind === "event") ?? covering[0] ?? null;
}

function nextAfter(items: TimedOccurrence[], now: Date): TimedOccurrence | null {
  return items.find((item) => item.start > now && item.task?.status !== "completed") ?? null;
}

export function bandFor(
  occurrence: TimedOccurrence,
  now: Date,
  nextId: string | null,
  runningId: string | null,
): TimeBand {
  if (occurrence.task?.status === "completed") return "past";
  if (runningId && occurrence.id === runningId) return "now";
  if (occurrence.start <= now && occurrence.end > now) return "now";
  if (occurrence.end <= now) return "past";
  if (nextId && occurrence.id === nextId) return "next";
  return "later";
}

function noticeFor(
  doc: StoreDocument,
  now: Date,
  running: Task | null,
  elapsed: number,
  next: TimedOccurrence | null,
): DayNotice | null {
  const conflicts = detectConflicts(eventsOnDay(doc, now));
  if (conflicts.length > 0) {
    return {
      id: "conflict",
      kind: "conflict",
      companionState: "warning",
      messageKey: "conflict",
      title: conflicts[0][0].title,
      itemId: conflicts[0][0].id,
      timeLabel: null,
      minutes: null,
    };
  }
  if (running && running.estimatedMinutes && elapsed > running.estimatedMinutes) {
    return {
      id: `overrun:${running.id}`,
      kind: "overrun",
      companionState: "warning",
      messageKey: "overrun",
      title: running.title,
      itemId: running.id,
      timeLabel: null,
      minutes: elapsed - running.estimatedMinutes,
    };
  }
  if (next && next.kind === "event" && next.start > now) {
    const minutes = minutesBetween(now, next.start);
    if (minutes > 0 && minutes <= UPCOMING_MINUTES) {
      return {
        id: `upcoming:${next.id}`,
        kind: "upcoming",
        companionState: "reminding",
        messageKey: "upcoming",
        title: next.event?.title ?? next.task?.title ?? "",
        itemId: next.id,
        timeLabel: null,
        minutes,
      };
    }
  }
  return null;
}

function unresolvedNotice(items: TimedOccurrence[], now: Date, evening: boolean): DayNotice | null {
  if (evening) return null;
  const open = items.find((item) => attentionFor(item, now) === "stillOpen");
  if (!open?.task) return null;
  return {
    id: `unresolved:${open.id}`,
    kind: "unresolved",
    companionState: "curious",
    messageKey: "stillWantThis",
    title: open.task.title,
    itemId: open.id,
    timeLabel: null,
    minutes: null,
  };
}

export function buildDaySnapshot(
  doc: StoreDocument,
  now: Date,
  elapsedFor: (taskId: string) => number = () => 0,
): DaySnapshot {
  const items = occurrencesOnDay(doc, now);
  const running = doc.items.filter(isTask).find((task) => task.status === "running") ?? null;
  const covering = coveringNow(items, now);
  const next = nextAfter(items, now);
  const runningOnTimeline = running ? (items.find((item) => item.id === running.id) ?? null) : null;
  const nowOccurrence = running
    ? (runningOnTimeline ?? {
        id: running.id,
        kind: "task" as const,
        start: now,
        end: now,
        task: running,
        event: null,
      })
    : covering;
  const greeting = greetingPeriod(now);
  const evening = greeting === "evening" || greeting === "night";
  const unfinished = unfinishedTasks(doc, now);
  const completedToday = completedTasksOnDay(doc, now);
  const minutesFree = next ? minutesBetween(now, next.start) : covering ? null : OPEN_MINUTES;
  const nextId = next?.id ?? null;
  const bands: Record<string, TimeBand> = {};
  const attention: Record<string, AttentionPhase> = {};
  for (const item of items) {
    bands[item.id] = bandFor(item, now, nextId, running?.id ?? null);
    attention[item.id] = attentionFor(item, now);
  }
  const elapsed = running ? elapsedFor(running.id) : 0;
  return {
    greeting,
    showEveningClose: evening && unfinished.length > 0,
    showEveningSettled: evening && unfinished.length === 0,
    nowOccurrence: nowOccurrence ?? null,
    nextOccurrence: next,
    minutesFree,
    usableMinutes: getUsableTimeToday(doc, now),
    externalCalendar: eventsOnDay(doc, now).some((item) => item.source.kind === "connector"),
    unfinished,
    completedToday,
    advice: adviceNow(doc, now),
    notice: noticeFor(doc, now, running, elapsed, next) ?? unresolvedNotice(items, now, evening),
    bands,
    attention,
  };
}
