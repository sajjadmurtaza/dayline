import { atTime } from "@/lib/clock";
import { minutesBetweenDates } from "@/lib/dates";
import type { GreetingPeriod, TimeBand, TimedOccurrence } from "@/domains/planning/day-view";

export type SpineGap = {
  type: "gap";
  id: string;
  start: Date;
  end: Date;
  minutes: number;
};

export type SpineItem = {
  type: "item";
  occurrence: TimedOccurrence;
  band: TimeBand;
};

export type SpineNow = { type: "now"; at: Date };
export type SpineCurrent = { type: "current"; occurrence: TimedOccurrence };
export type SpineAtmosphere = { type: "atmosphere"; period: "morning" | "evening" };

export type SpineNode = SpineGap | SpineItem | SpineNow | SpineCurrent | SpineAtmosphere;

export function dayOpen(now: Date) {
  return atTime(now, 6, 0);
}

export function gapHeight(minutes: number) {
  if (minutes <= 0) return 0;
  if (minutes < 8) return 16;
  return Math.min(24 + minutes * 0.7, 112);
}

export function itemHeight(minutes: number, band: TimeBand | "current") {
  const m = Math.max(minutes, 15);
  if (band === "past") return Math.max(52, Math.min(m * 0.36, 80));
  if (band === "current" || band === "now") return Math.max(156, Math.min(m * 0.7, 220));
  if (band === "next") return Math.max(88, Math.min(m * 0.55, 128));
  return Math.max(72, Math.min(m * 0.48, 108));
}

function pushGap(nodes: SpineNode[], from: Date, to: Date) {
  const minutes = minutesBetweenDates(from, to);
  if (minutes < 5) return;
  nodes.push({
    type: "gap",
    id: `gap:${from.toISOString()}:${to.toISOString()}`,
    start: from,
    end: to,
    minutes,
  });
}

export function buildSpine({
  items,
  now,
  bands,
  current,
  greeting,
}: {
  items: TimedOccurrence[];
  now: Date;
  bands: Record<string, TimeBand>;
  current: TimedOccurrence | null;
  greeting: GreetingPeriod;
}): SpineNode[] {
  const currentId = current?.id ?? null;
  const placed = items.filter((item) => item.id !== currentId);
  const past = placed.filter((item) => item.end <= now);
  const live = placed.filter((item) => item.start <= now && item.end > now);
  const upcoming = placed.filter((item) => item.start > now);
  const nodes: SpineNode[] = [{ type: "atmosphere", period: "morning" }];
  let cursor = dayOpen(now);

  for (const occurrence of past) {
    pushGap(nodes, cursor, occurrence.start);
    nodes.push({ type: "item", occurrence, band: bands[occurrence.id] ?? "past" });
    if (occurrence.end > cursor) cursor = occurrence.end;
  }

  pushGap(nodes, cursor, now);
  nodes.push({ type: "now", at: now });

  if (current) {
    nodes.push({ type: "current", occurrence: current });
  }

  for (const occurrence of live) {
    nodes.push({ type: "item", occurrence, band: bands[occurrence.id] ?? "now" });
  }

  let afterNow = current && current.kind === "event" && current.end > now ? current.end : now;
  if (!current && live[0]) afterNow = live[0].end;

  for (const occurrence of upcoming) {
    pushGap(nodes, afterNow, occurrence.start);
    nodes.push({ type: "item", occurrence, band: bands[occurrence.id] ?? "later" });
    afterNow = occurrence.end;
  }

  if (greeting === "evening" || greeting === "night") {
    nodes.push({ type: "atmosphere", period: "evening" });
  }

  return nodes;
}
