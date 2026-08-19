import { describe, expect, it } from "vitest";
import {
  attentionFor,
  bandFor,
  buildDaySnapshot,
  greetingPeriod,
  unfinishedTasks,
} from "@/domains/planning/day-view";
import { seedDemo } from "@/domains/workspace/seed";
import { atTime, type Clock } from "@/lib/clock";
import { isEvent, isTask } from "@/lib/types";

function clockAt(hours: number, minutes: number): Clock {
  return { now: () => atTime(new Date("2026-08-19"), hours, minutes) };
}

describe("greetingPeriod", () => {
  it("maps morning afternoon evening night", () => {
    expect(greetingPeriod(atTime(new Date("2026-08-19"), 8, 0))).toBe("morning");
    expect(greetingPeriod(atTime(new Date("2026-08-19"), 13, 0))).toBe("afternoon");
    expect(greetingPeriod(atTime(new Date("2026-08-19"), 18, 30))).toBe("evening");
    expect(greetingPeriod(atTime(new Date("2026-08-19"), 21, 15))).toBe("night");
  });
});

describe("buildDaySnapshot", () => {
  it("marks standup as now and the presentation as next mid-standup", () => {
    const clock = clockAt(9, 10);
    const seeded = seedDemo(clock);
    const snap = buildDaySnapshot(seeded, clock.now());
    const standup = seeded.items.find((item) => isEvent(item) && item.title.includes("standup"));
    const lunch = seeded.items.find((item) => isEvent(item) && item.title === "Lunch");
    expect(standup && snap.bands[standup.id]).toBe("now");
    expect(lunch && snap.bands[lunch.id]).toBe("later");
    expect(snap.nowOccurrence?.event?.title).toBe("Team standup");
    expect(snap.nextOccurrence?.task?.title).toContain("presentation");
  });

  it("settles morning events into past by afternoon", () => {
    const clock = clockAt(13, 0);
    const seeded = seedDemo(clock);
    const snap = buildDaySnapshot(seeded, clock.now());
    const standup = seeded.items.find((item) => isEvent(item) && item.title.includes("standup"));
    const call = seeded.items.find((item) => isEvent(item) && item.title.includes("Client"));
    expect(standup && snap.bands[standup.id]).toBe("past");
    expect(call && snap.bands[call.id]).toBe("next");
    expect(snap.showEveningClose).toBe(false);
  });

  it("opens evening close when work is still unfinished at night", () => {
    const clock = clockAt(21, 20);
    const seeded = seedDemo(clock);
    const snap = buildDaySnapshot(seeded, clock.now());
    expect(snap.showEveningClose).toBe(true);
    expect(snap.showEveningSettled).toBe(false);
    expect(unfinishedTasks(seeded, clock.now()).length).toBeGreaterThan(0);
    expect(snap.notice).toBeNull();
  });

  it("settles evening when nothing unfinished remains", () => {
    const clock = clockAt(21, 20);
    const seeded = seedDemo(clock);
    const cleared = {
      ...seeded,
      items: seeded.items.map((item) =>
        isTask(item) && item.status !== "completed" && item.status !== "cancelled"
          ? { ...item, status: "completed" as const }
          : item,
      ),
    };
    const snap = buildDaySnapshot(cleared, clock.now());
    expect(snap.showEveningClose).toBe(false);
    expect(snap.showEveningSettled).toBe(true);
  });

  it("includes a running sometime task in unfinished work", () => {
    const clock = clockAt(21, 20);
    const seeded = seedDemo(clock);
    const paper = seeded.items.find((item) => isTask(item) && item.title.includes("research"));
    if (!paper || !isTask(paper)) throw new Error("expected research task");
    const running = {
      ...seeded,
      items: seeded.items.map((item) =>
        item.id === paper.id ? { ...paper, status: "running" as const } : item,
      ),
    };
    expect(unfinishedTasks(running, clock.now()).some((task) => task.id === paper.id)).toBe(true);
  });

  it("warns when a running task overruns its estimate", () => {
    const clock = clockAt(11, 0);
    const seeded = seedDemo(clock);
    const task = seeded.items.find((item) => isTask(item) && item.title.includes("presentation"))!;
    const running = {
      ...seeded,
      items: seeded.items.map((item) =>
        item.id === task.id && isTask(item) ? { ...item, status: "running" as const } : item,
      ),
    };
    const snap = buildDaySnapshot(running, clock.now(), () => 95);
    expect(snap.notice?.kind).toBe("overrun");
    expect(snap.notice?.companionState).toBe("warning");
    expect(snap.bands[task.id]).toBe("now");
  });
});

describe("attentionFor", () => {
  it("never marks a fixed event as still open", () => {
    const clock = clockAt(16, 0);
    const seeded = seedDemo(clock);
    const standup = seeded.items.find((item) => isEvent(item) && item.title.includes("standup"));
    if (!standup || !isEvent(standup)) throw new Error("expected standup");
    const occurrence = {
      id: standup.id,
      kind: "event" as const,
      start: new Date(standup.start),
      end: new Date(standup.end),
      task: null,
      event: standup,
    };
    expect(attentionFor(occurrence, clock.now())).toBe("none");
  });

  it("escalates a flexible task from ready to still open without judging", () => {
    const startClock = clockAt(10, 1);
    const seeded = seedDemo(startClock);
    const task = seeded.items.find((item) => isTask(item) && item.title.includes("presentation"));
    if (!task || !isTask(task) || !task.scheduledStart || !task.scheduledEnd) {
      throw new Error("expected presentation");
    }
    const occurrence = {
      id: task.id,
      kind: "task" as const,
      start: new Date(task.scheduledStart),
      end: new Date(task.scheduledEnd),
      task,
      event: null,
    };
    expect(attentionFor(occurrence, startClock.now())).toBe("ready");
    expect(attentionFor(occurrence, clockAt(10, 12).now())).toBe("waiting");
    const later = clockAt(13, 0);
    expect(attentionFor(occurrence, later.now())).toBe("stillOpen");
    const snap = buildDaySnapshot(seeded, later.now());
    expect(snap.notice?.kind).toBe("unresolved");
    expect(snap.notice?.companionState).toBe("curious");
    expect(snap.attention[task.id]).toBe("stillOpen");
  });
});

describe("bandFor", () => {
  it("treats a completed task as past even if the window is later", () => {
    const clock = clockAt(10, 15);
    const seeded = seedDemo(clock);
    const task = seeded.items.find((item) => isTask(item) && item.title.includes("presentation"));
    if (!task || !isTask(task) || !task.scheduledStart || !task.scheduledEnd) {
      throw new Error("expected scheduled presentation task");
    }
    const occurrence = {
      id: task.id,
      kind: "task" as const,
      start: new Date(task.scheduledStart),
      end: new Date(task.scheduledEnd),
      task: { ...task, status: "completed" as const },
      event: null,
    };
    expect(bandFor(occurrence, clock.now(), task.id, null)).toBe("past");
  });
});
