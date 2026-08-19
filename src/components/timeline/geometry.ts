export const TIMELINE_START = 6 * 60;
export const TIMELINE_END = 23 * 60;
export const TIMELINE_HOUR = 56;

export function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function topFor(date: Date) {
  return ((minutesOf(date) - TIMELINE_START) / 60) * TIMELINE_HOUR;
}

export function nowTop(date: Date) {
  const minutes = Math.min(Math.max(minutesOf(date), TIMELINE_START), TIMELINE_END);
  return ((minutes - TIMELINE_START) / 60) * TIMELINE_HOUR;
}

export function heightFor(start: Date, end: Date) {
  return Math.max(((end.getTime() - start.getTime()) / 3_600_000) * TIMELINE_HOUR, 28);
}

export function timelineHeight() {
  return ((TIMELINE_END - TIMELINE_START) / 60) * TIMELINE_HOUR;
}
