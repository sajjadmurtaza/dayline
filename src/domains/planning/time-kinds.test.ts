import { describe, expect, it } from "vitest";
import {
  acceptPlacement,
  acceptSuggestedEstimate,
  cancelFixedEvent,
  canMoveItem,
  dismissPlacement,
  faceClass,
  gapKind,
  isReservedLunch,
  placementCue,
  shiftFixedEvent,
  canDeleteEvent,
  canDragEvent,
  canEditEvent,
  canResizeEvent,
  isExternallyManagedEvent,
  showsCalendarIcon,
  suggestedEstimate,
  timeFace,
} from "@/domains/planning/time-kinds";
import { deleteItem } from "@/domains/workspace/commands";
import { emptyStore } from "@/lib/store/repository";
import type { CalendarEvent, StoreDocument, Task } from "@/lib/types";
import { isTask } from "@/lib/types";

const clock = { now: () => new Date("2026-09-29T10:00:00") };

function event(partial: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "source" | "start" | "end">): CalendarEvent {
  return {
    kind: "event",
    title: partial.title ?? "Client call",
    createdAt: clock.now().toISOString(),
    updatedAt: clock.now().toISOString(),
    projectId: null,
    areaId: null,
    tags: [],
    location: null,
    conferenceUrl: null,
    description: "",
    flexibility: "fixed",
    ...partial,
  };
}

function task(partial: Partial<Task> & Pick<Task, "id">): Task {
  return {
    kind: "task",
    title: partial.title ?? "Proposal",
    createdAt: clock.now().toISOString(),
    updatedAt: clock.now().toISOString(),
    projectId: null,
    areaId: null,
    tags: [],
    source: { kind: "local" },
    status: "planned",
    estimatedMinutes: 45,
    actualMinutes: 0,
    scheduledStart: null,
    scheduledEnd: null,
    deadline: null,
    deadlineKind: "none",
    priority: "normal",
    notes: "",
    parentTaskId: null,
    dependsOn: [],
    flexibility: "flexible",
    interruptible: true,
    sometime: false,
    waitingFor: null,
    ...partial,
  };
}

function store(items: StoreDocument["items"]): StoreDocument {
  return { ...emptyStore(), items };
}

describe("three kinds of time", () => {
  const google = event({
    id: "meet",
    title: "Client call",
    source: { kind: "connector", connectorId: "google-calendar", externalId: "g-1" },
    start: "2026-09-29T02:00:00.000Z",
    end: "2026-09-29T02:45:00.000Z",
  });
  const lunch = event({
    id: "lunch",
    title: "Lunch",
    source: { kind: "local-rule", rule: "lunch" },
    start: "2026-09-29T03:30:00.000Z",
    end: "2026-09-29T04:30:00.000Z",
  });
  const placed = task({
    id: "task_123",
    scheduledStart: "2026-09-29T01:00:00.000Z",
    scheduledEnd: "2026-09-29T01:45:00.000Z",
  });

  it("keeps a connector event fixed and marked, and lunch reserved without a calendar icon", () => {
    expect(canMoveItem(google)).toBe(false);
    expect(canMoveItem(lunch)).toBe(false);
    expect(timeFace(google)).toBe("fixed");
    expect(timeFace(lunch)).toBe("fixed");
    expect(showsCalendarIcon(google)).toBe(true);
    expect(showsCalendarIcon(lunch)).toBe(false);
    expect(isExternallyManagedEvent(google)).toBe(true);
    expect(canEditEvent(google)).toBe(false);
    expect(canDragEvent(google)).toBe(false);
    expect(canResizeEvent(google)).toBe(false);
    expect(canDeleteEvent(google)).toBe(false);
    const mine = event({ id: "mine", source: { kind: "local" }, start: google.start, end: google.end });
    expect(canEditEvent(mine)).toBe(true);
    expect(deleteItem(store([google]), google.id, clock).items).toHaveLength(1);
    expect(deleteItem(store([mine]), mine.id, clock).items).toHaveLength(0);
    expect(isReservedLunch(lunch)).toBe(true);
    expect(faceClass("fixed")).toBe("time-fixed");
  });

  it("renders an accepted flexible task as yours", () => {
    expect(placed.flexibility).toBe("flexible");
    expect(timeFace(placed)).toBe("yours");
    expect(faceClass("yours")).toBe("time-yours");
    expect(canMoveItem(placed)).toBe(true);
  });

  it("keeps a proposal off the task until Accept, and leaves it unchanged on dismiss", () => {
    const doc = store([placed]);
    const proposal = {
      taskId: placed.id,
      proposedPlacement: {
        startsAt: "2026-09-29T05:00:00.000Z",
        endsAt: "2026-09-29T05:45:00.000Z",
      },
    };
    expect(dismissPlacement(doc, proposal)).toBe(doc);
    expect(doc.items.find((item) => item.id === placed.id)).toMatchObject({
      scheduledStart: placed.scheduledStart,
      scheduledEnd: placed.scheduledEnd,
    });
    const accepted = acceptPlacement(doc, proposal, clock);
    const written = accepted.items.find((item) => item.id === placed.id);
    expect(isTask(written!) && written.scheduledStart).toBe(proposal.proposedPlacement.startsAt);
    expect(isTask(written!) && written.scheduledEnd).toBe(proposal.proposedPlacement.endsAt);
    expect(faceClass("proposed")).toBe("time-proposed");
  });

  it("keeps a suggested duration separate from a placement until the estimate is accepted", () => {
    const open = task({ id: "email", estimatedMinutes: null, status: "inbox" });
    const guess = suggestedEstimate(open);
    expect(guess).toEqual({ minutes: 25, confidence: "suggested" });
    const proposal = {
      taskId: open.id,
      proposedPlacement: {
        startsAt: "2026-09-29T05:00:00.000Z",
        endsAt: "2026-09-29T05:25:00.000Z",
      },
    };
    const doc = store([open]);
    const placedOnly = acceptPlacement(doc, proposal, clock);
    const afterPlace = placedOnly.items.find((item) => item.id === open.id);
    expect(isTask(afterPlace!) && afterPlace.estimatedMinutes).toBeNull();
    expect(isTask(afterPlace!) && afterPlace.scheduledStart).toBe(proposal.proposedPlacement.startsAt);
    const estimated = acceptSuggestedEstimate(doc, open.id, guess!, clock);
    const afterEstimate = estimated.items.find((item) => item.id === open.id);
    expect(isTask(afterEstimate!) && afterEstimate.estimatedMinutes).toBe(25);
    expect(isTask(afterEstimate!) && afterEstimate.scheduledStart).toBeNull();
  });

  it("proposes a reflow when a moved meeting hits accepted work, and Leave everything keeps that work", () => {
    const meeting = event({
      id: "meet",
      source: { kind: "connector", connectorId: "google-calendar", externalId: "g-2" },
      start: "2026-09-29T02:00:00.000Z",
      end: "2026-09-29T02:45:00.000Z",
    });
    const work = task({
      id: "proposal",
      scheduledStart: "2026-09-29T05:00:00.000Z",
      scheduledEnd: "2026-09-29T05:45:00.000Z",
    });
    const shifted = shiftFixedEvent(
      store([meeting, work]),
      meeting.id,
      new Date("2026-09-29T05:00:00.000Z"),
      new Date("2026-09-29T05:45:00.000Z"),
    );
    expect(shifted?.from.start).toBe(meeting.start);
    expect(shifted?.to.start).toBe("2026-09-29T05:00:00.000Z");
    const left = dismissPlacement(shifted!.doc, shifted!.reflow!);
    const unchanged = left.items.find((item) => item.id === work.id);
    expect(isTask(unchanged!) && unchanged.scheduledStart).toBe(work.scheduledStart);
    const movedEvent = left.items.find((item) => item.id === meeting.id);
    expect(movedEvent && "start" in movedEvent && movedEvent.start).toBe("2026-09-29T05:00:00.000Z");
    const used = acceptPlacement(shifted!.doc, shifted!.reflow!, clock);
    const rewritten = used.items.find((item) => item.id === work.id);
    expect(isTask(rewritten!) && rewritten.scheduledStart).toBe(shifted!.reflow!.proposedPlacement.startsAt);
    expect(shifted!.reflow!.proposedPlacement.startsAt).not.toBe(work.scheduledStart);
  });

  it("opens a usable gap when a cancelled meeting fits unplaced work", () => {
    const meeting = event({
      id: "meet",
      source: { kind: "connector", connectorId: "google-calendar", externalId: "g-3" },
      start: "2026-09-29T02:00:00.000Z",
      end: "2026-09-29T02:45:00.000Z",
    });
    const waiting = task({ id: "email", status: "inbox", estimatedMinutes: 25, sometime: false });
    const opened = cancelFixedEvent(store([meeting, waiting]), meeting.id);
    expect(opened.doc.items.some((item) => item.id === meeting.id)).toBe(false);
    expect(opened.title).toBe("Client call");
    expect(opened.cue?.minutes).toBe(45);
    expect(opened.cue?.task.id).toBe(waiting.id);
    expect(isTask(opened.doc.items[0]!) && opened.doc.items[0].scheduledStart).toBeNull();
  });

  it("stays quiet for a 7-minute gap, a gap under 20 minutes, and a gap no task fits", () => {
    const email = task({ id: "email", status: "inbox", estimatedMinutes: 10, sometime: false });
    const long = task({ id: "research", status: "inbox", estimatedMinutes: 60, sometime: false });
    expect(gapKind(7)).toBe("too_short");
    expect(placementCue(7, [email], clock.now())).toBeNull();
    expect(placementCue(15, [email], clock.now())).toBeNull();
    expect(placementCue(40, [long], clock.now())).toBeNull();
    expect(placementCue(45, [email], clock.now())?.task.id).toBe(email.id);
  });
});
