export type Clock = { now: () => Date };

export const systemClock: Clock = { now: () => new Date() };

export function iso(date: Date): string {
  return date.toISOString();
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function atTime(date: Date, hours: number, minutes: number): Date {
  const next = startOfDay(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
