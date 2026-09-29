import { createId } from "@/lib/id";
import { addDays, atTime, iso, startOfDay, type Clock } from "@/lib/clock";
import { emptyStore } from "@/lib/store/repository";
import type { CalendarEvent, Note, Project, StoreDocument, Task } from "@/lib/types";

function task(
  clock: Clock,
  partial: Omit<
    Task,
    | "kind"
    | "createdAt"
    | "updatedAt"
    | "source"
    | "flexibility"
    | "tags"
    | "dependsOn"
    | "parentTaskId"
    | "interruptible"
    | "actualMinutes"
    | "waitingFor"
  > &
    Partial<Pick<Task, "interruptible" | "actualMinutes" | "waitingFor" | "tags">>,
): Task {
  const now = iso(clock.now());
  return {
    kind: "task",
    createdAt: now,
    updatedAt: now,
    source: { kind: "local" },
    flexibility: "flexible",
    tags: partial.tags ?? [],
    dependsOn: [],
    parentTaskId: null,
    interruptible: partial.interruptible ?? true,
    actualMinutes: partial.actualMinutes ?? 0,
    waitingFor: partial.waitingFor ?? null,
    ...partial,
  };
}

export function seedDemo(clock: Clock): StoreDocument {
  const day = startOfDay(clock.now());
  const now = iso(clock.now());
  const project: Project = {
    id: createId(),
    name: "Acme proposal",
    areaId: "work",
    createdAt: now,
  };

  const standup: CalendarEvent = {
    id: createId(),
    kind: "event",
    title: "Team standup",
    createdAt: now,
    updatedAt: now,
    projectId: null,
    areaId: "work",
    tags: [],
    source: { kind: "local" },
    start: atTime(day, 9, 0).toISOString(),
    end: atTime(day, 9, 30).toISOString(),
    location: null,
    conferenceUrl: null,
    description: "",
    flexibility: "fixed",
  };
  const lunch: CalendarEvent = {
    id: createId(),
    kind: "event",
    title: "Lunch",
    createdAt: now,
    updatedAt: now,
    projectId: null,
    areaId: "personal",
    tags: [],
    source: { kind: "local-rule", rule: "lunch" },
    start: atTime(day, 12, 30).toISOString(),
    end: atTime(day, 13, 30).toISOString(),
    location: null,
    conferenceUrl: null,
    description: "",
    flexibility: "fixed",
  };
  const call: CalendarEvent = {
    id: createId(),
    kind: "event",
    title: "Client call",
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    areaId: "work",
    tags: [],
    source: { kind: "local" },
    start: atTime(day, 14, 0).toISOString(),
    end: atTime(day, 15, 0).toISOString(),
    location: null,
    conferenceUrl: "https://meet.example.com/acme",
    description: "",
    flexibility: "fixed",
  };

  const proposal = task(clock, {
    id: createId(),
    title: "Prepare client presentation",
    projectId: project.id,
    areaId: "work",
    status: "planned",
    estimatedMinutes: 90,
    scheduledStart: atTime(day, 10, 0).toISOString(),
    scheduledEnd: atTime(day, 11, 30).toISOString(),
    deadline: addDays(day, 2).toISOString(),
    deadlineKind: "due",
    priority: "high",
    notes: "Need latest pricing and last meeting notes.",
    sometime: false,
  });
  const email = task(clock, {
    id: createId(),
    title: "Email follow-ups",
    projectId: project.id,
    areaId: "work",
    status: "inbox",
    estimatedMinutes: 25,
    scheduledStart: null,
    scheduledEnd: null,
    deadline: null,
    deadlineKind: "none",
    priority: "normal",
    notes: "",
    sometime: false,
  });
  const read = task(clock, {
    id: createId(),
    title: "Read research paper",
    projectId: null,
    areaId: "study",
    status: "inbox",
    estimatedMinutes: 45,
    scheduledStart: null,
    scheduledEnd: null,
    deadline: null,
    deadlineKind: "none",
    priority: "low",
    notes: "",
    sometime: true,
  });

  const sticky: Note = {
    id: createId(),
    kind: "note",
    title: "Annual pricing test",
    body: "Test annual pricing with new customers.",
    createdAt: now,
    updatedAt: now,
    projectId: project.id,
    areaId: "work",
    tags: [],
    source: { kind: "local" },
    noteType: "idea",
    pinnedToday: true,
    linkedItemIds: [],
  };

  const store = emptyStore();
  return {
    ...store,
    seeded: true,
    projects: [project],
    items: [standup, lunch, call, proposal, email, read, sticky],
  };
}
