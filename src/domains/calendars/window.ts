import { addDays, startOfDay } from "@/lib/clock";

export type ImportWindow = { start: Date; end: Date };

/** Today through the next 7 days. End is exclusive. */
export function importWindow(now: Date): ImportWindow {
  const start = startOfDay(now);
  const end = addDays(start, 7);
  return { start, end };
}

export function inWindow(start: Date, window: ImportWindow, end?: Date): boolean {
  if (end && end.getTime() <= window.start.getTime()) return false;
  return start.getTime() < window.end.getTime() && (end ? end.getTime() > window.start.getTime() : start.getTime() >= window.start.getTime());
}
