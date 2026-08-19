import { describe, expect, it } from "vitest";
import { parseCapture } from "@/domains/capture/parse";
import { processBrainDump } from "@/domains/brain-dump/process";
import { adviceNow, detectConflicts, proposeDayPlan } from "@/domains/planning/engine";
import { acceptPlan, applyCapture, completeTask, startTask } from "@/domains/workspace/commands";
import { seedDemo } from "@/domains/workspace/seed";
import { atTime, startOfDay, type Clock } from "@/lib/clock";
import { isEvent, isTask } from "@/lib/types";

const noon: Clock = { now: () => atTime(new Date("2026-08-19T12:00:00"), 12, 0) };

describe("parseCapture", () => {
  it("classifies a timed call as a task with a start", () => {
    const result = parseCapture("Call Ahmed tomorrow at 3", new Date("2026-08-19T10:00:00"));
    expect(result?.kind).toBe("task");
    expect(result?.title.toLowerCase()).toContain("call ahmed");
    expect(result?.scheduledStart).toBeTruthy();
    expect(result?.uncertainTime).toBe(false);
  });

  it("does not invent a time for dinner on Friday", () => {
    const result = parseCapture("Dinner with John Friday", new Date("2026-08-19T10:00:00"));
    expect(result?.uncertainTime).toBe(true);
    expect(result?.scheduledStart).toBeNull();
  });

  it("treats idea: as a note", () => {
    expect(parseCapture("Idea: subscription pricing", new Date())?.kind).toBe("note");
  });
});

describe("planning", () => {
  it("never moves fixed events when placing tasks", () => {
    const seeded = seedDemo(noon);
    const eventsBefore = seeded.items.filter(isEvent).map((event) => event.start);
    const proposal = proposeDayPlan(seeded, noon.now());
    expect(proposal.moves.length).toBeGreaterThan(0);
    const after = acceptPlan(seeded, noon);
    const eventsAfter = after.items.filter(isEvent).map((event) => event.start);
    expect(eventsAfter).toEqual(eventsBefore);
  });

  it("detects overlapping events", () => {
    const day = startOfDay(new Date("2026-08-19"));
    const seeded = seedDemo({ now: () => day });
    const extra = seeded.items.filter(isEvent)[2];
    const clash = { ...extra, id: "clash", start: extra.start, end: extra.end };
    const pairs = detectConflicts([...seeded.items.filter(isEvent), clash]);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("recommends a fitting task when time is free", () => {
    const clock: Clock = { now: () => atTime(new Date("2026-08-19"), 11, 40) };
    const advice = adviceNow(seededAt(clock), clock.now());
    expect(advice?.kind === "suggest" || advice?.kind === "running").toBe(true);
  });
});

function seededAt(clock: Clock) {
  return seedDemo(clock);
}

describe("timer", () => {
  it("records actual minutes on complete after start", () => {
    let t = atTime(new Date("2026-08-19"), 10, 0);
    const clock: Clock = { now: () => t };
    const seeded = seedDemo(clock);
    const task = seeded.items.find((item) => isTask(item) && item.title.includes("presentation"))!;
    const started = startTask(seeded, task.id, clock);
    t = atTime(new Date("2026-08-19"), 10, 27);
    const done = completeTask(started, task.id, clock);
    const finished = done.items.find((item) => item.id === task.id);
    expect(isTask(finished!) && finished.status).toBe("completed");
    expect(isTask(finished!) && finished.actualMinutes).toBe(27);
  });
});

describe("brain dump", () => {
  it("splits lines into suggestions", () => {
    const lines = processBrainDump("Email Michael\nIdea: pricing\nBuy milk sometime", new Date());
    expect(lines).toHaveLength(3);
    expect(lines[1]?.kind).toBe("note");
    expect(lines[2]?.sometime).toBe(true);
  });
});

describe("capture apply", () => {
  it("adds an inbox task", () => {
    const doc = applyCapture(
      seedDemo(noon),
      {
        kind: "task",
        title: "Buy charger",
        estimatedMinutes: 15,
        scheduledStart: null,
        scheduledEnd: null,
        noteType: null,
        priority: "normal",
        sometime: false,
        uncertainTime: false,
      },
      noon,
    );
    expect(doc.items.some((item) => item.title === "Buy charger")).toBe(true);
  });
});
