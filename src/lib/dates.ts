import { differenceInMinutes } from "date-fns";

export function minutesBetweenDates(start: Date, end: Date) {
  return Math.max(0, differenceInMinutes(end, start));
}

export function formatClock(date: Date, locale: string) {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function formatClockRange(start: Date, end: Date, locale: string) {
  return `${formatClock(start, locale)}–${formatClock(end, locale)}`;
}
