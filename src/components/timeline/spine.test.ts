import { describe, expect, it } from "vitest";
import { buildDaySnapshot, occurrencesOnDay } from "@/domains/planning/day-view";
import { seedDemo } from "@/domains/workspace/seed";
import { atTime, type Clock } from "@/lib/clock";
import { isTask } from "@/lib/types";
import { buildSpine, gapHeight } from "@/components/timeline/spine";

function clockAt(hours: number, minutes: number): Clock {
  return { now: () => atTime(new Date("2026-08-19"), hours, minutes) };
}

describe("gapHeight", () => {
  it("makes a 90-minute gap larger than a 10-minute gap", () => {
    expect(gapHeight(90)).toBeGreaterThan(gapHeight(10) * 2);
  });
});

describe("buildSpine", () => {
  it("places a covering event on NOW instead of a detached slot", () => {
    const clock = clockAt(9, 10);
    const seeded = seedDemo(clock);
    const now = clock.now();
    const snap = buildDaySnapshot(seeded, now);
    const nodes = buildSpine({
      items: occurrencesOnDay(seeded, now),
      now,
      bands: snap.bands,
      current: snap.nowOccurrence,
      greeting: snap.greeting,
    });
    const current = nodes.find((node) => node.type === "current");
    expect(current?.type === "current" && current.occurrence.event?.title).toBe("Team standup");
    expect(nodes.some((node) => node.type === "now")).toBe(true);
  });

  it("keeps a running morning task on NOW in the evening", () => {
    const clock = clockAt(21, 20);
    const seeded = seedDemo(clock);
    const task = seeded.items.find((item) => isTask(item) && item.title.includes("presentation"))!;
    const running = {
      ...seeded,
      items: seeded.items.map((item) =>
        item.id === task.id && isTask(item) ? { ...item, status: "running" as const } : item,
      ),
    };
    const now = clock.now();
    const snap = buildDaySnapshot(running, now);
    const nodes = buildSpine({
      items: occurrencesOnDay(running, now),
      now,
      bands: snap.bands,
      current: snap.nowOccurrence,
      greeting: snap.greeting,
    });
    const current = nodes.find((node) => node.type === "current");
    expect(current?.type === "current" && current.occurrence.task?.title).toContain("presentation");
    const pastTitles = nodes
      .filter((node) => node.type === "item" && node.band === "past")
      .map((node) =>
        node.type === "item" ? (node.occurrence.event?.title ?? node.occurrence.task?.title) : "",
      );
    expect(pastTitles.join(" ")).not.toContain("presentation");
    expect(nodes.some((node) => node.type === "atmosphere" && node.period === "evening")).toBe(
      true,
    );
  });

  it("renders a longer free gap before a later commitment", () => {
    const clock = clockAt(11, 0);
    const seeded = seedDemo(clock);
    const now = clock.now();
    const snap = buildDaySnapshot(seeded, now);
    const nodes = buildSpine({
      items: occurrencesOnDay(seeded, now),
      now,
      bands: snap.bands,
      current: snap.nowOccurrence,
      greeting: snap.greeting,
    });
    const gaps = nodes.filter((node) => node.type === "gap");
    const lunchGap = gaps.find((node) => node.type === "gap" && node.minutes === 90);
    expect(lunchGap).toBeTruthy();
    expect(gapHeight(lunchGap!.minutes)).toBeGreaterThan(gapHeight(30));
  });
});
