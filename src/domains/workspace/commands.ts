import type { CaptureSuggestion } from "@/domains/capture/parse";
import { parseCapture } from "@/domains/capture/parse";
import { processBrainDump } from "@/domains/brain-dump/process";
import { proposeDayPlan } from "@/domains/planning/engine";
import { createId } from "@/lib/id";
import { iso, type Clock } from "@/lib/clock";
import type { Item, Note, PauseReason, Project, StoreDocument, Task } from "@/lib/types";
import { isNote, isTask } from "@/lib/types";

const MAX_UNDO = 20;
const MAX_PINNED = 3;

function withUndo(doc: StoreDocument, label: string, clock: Clock): StoreDocument {
  const snapshot = JSON.stringify({
    items: doc.items,
    projects: doc.projects,
    sessions: doc.sessions,
  });
  return {
    ...doc,
    undo: [{ label, snapshot, at: iso(clock.now()) }, ...doc.undo].slice(0, MAX_UNDO),
  };
}

function replaceItem(doc: StoreDocument, item: Item): StoreDocument {
  return { ...doc, items: doc.items.map((current) => (current.id === item.id ? item : current)) };
}

export function undoLast(doc: StoreDocument): StoreDocument {
  const entry = doc.undo[0];
  if (!entry) return doc;
  const restored = JSON.parse(entry.snapshot) as Pick<
    StoreDocument,
    "items" | "projects" | "sessions"
  >;
  return { ...doc, ...restored, undo: doc.undo.slice(1) };
}

export function applyCapture(
  doc: StoreDocument,
  suggestion: CaptureSuggestion,
  clock: Clock,
): StoreDocument {
  const now = iso(clock.now());
  const base = {
    id: createId(),
    title: suggestion.title,
    createdAt: now,
    updatedAt: now,
    projectId: null as string | null,
    areaId: null,
    tags: [] as string[],
    source: { kind: "local" as const },
  };
  let item: Item;
  if (suggestion.kind === "note") {
    item = {
      ...base,
      kind: "note",
      body: suggestion.title,
      noteType: suggestion.noteType ?? "idea",
      pinnedToday: false,
      linkedItemIds: [],
    };
  } else if (suggestion.kind === "event") {
    item = {
      ...base,
      kind: "event",
      start: suggestion.scheduledStart ?? now,
      end: suggestion.scheduledEnd ?? now,
      location: null,
      conferenceUrl: null,
      description: "",
      flexibility: "fixed",
    };
  } else if (suggestion.kind === "reminder") {
    item = {
      ...base,
      kind: "reminder",
      remindAt: suggestion.scheduledStart ?? now,
      linkedItemId: null,
      done: false,
    };
  } else {
    const hasTime = Boolean(suggestion.scheduledStart);
    item = {
      ...base,
      kind: "task",
      status: hasTime ? "planned" : suggestion.sometime ? "inbox" : "inbox",
      estimatedMinutes: suggestion.estimatedMinutes,
      actualMinutes: 0,
      scheduledStart: suggestion.scheduledStart,
      scheduledEnd: suggestion.scheduledEnd,
      deadline: null,
      deadlineKind: "none",
      priority: suggestion.priority,
      notes: "",
      parentTaskId: null,
      dependsOn: [],
      flexibility: "flexible",
      interruptible: true,
      sometime: suggestion.sometime,
      waitingFor: null,
    };
  }
  return { ...withUndo(doc, "capture", clock), items: [...doc.items, item] };
}

export function captureText(doc: StoreDocument, text: string, clock: Clock): StoreDocument {
  const suggestion = parseCapture(text, clock.now());
  if (!suggestion) return doc;
  return applyCapture(doc, suggestion, clock);
}

export function applyBrainDump(
  doc: StoreDocument,
  text: string,
  selected: boolean[],
  clock: Clock,
): StoreDocument {
  const suggestions = processBrainDump(text, clock.now());
  let next = doc;
  suggestions.forEach((suggestion, index) => {
    if (selected[index]) next = applyCapture(next, suggestion, clock);
  });
  return next;
}

export function startTask(doc: StoreDocument, taskId: string, clock: Clock): StoreDocument {
  const now = clock.now();
  const pausedRunning = doc.items.map((item) => {
    if (isTask(item) && item.status === "running") {
      return { ...item, status: "paused" as const, updatedAt: iso(now) };
    }
    return item;
  });
  const items = pausedRunning.map((item) => {
    if (item.id !== taskId || !isTask(item)) return item;
    return { ...item, status: "running" as const, updatedAt: iso(now) };
  });
  const session = {
    id: createId(),
    taskId,
    startedAt: iso(now),
    endedAt: null,
    pauseReason: null,
  };
  return { ...withUndo(doc, "start", clock), items, sessions: [...doc.sessions, session] };
}

export function pauseTask(
  doc: StoreDocument,
  taskId: string,
  reason: PauseReason | null,
  clock: Clock,
): StoreDocument {
  const now = clock.now();
  const items = doc.items.map((item) => {
    if (item.id !== taskId || !isTask(item)) return item;
    const extra = elapsedMinutes(doc, item, now);
    return {
      ...item,
      status: "paused" as const,
      actualMinutes: item.actualMinutes + extra,
      updatedAt: iso(now),
    };
  });
  const sessions = doc.sessions.map((session) =>
    session.taskId === taskId && session.endedAt === null
      ? { ...session, endedAt: iso(now), pauseReason: reason }
      : session,
  );
  return { ...withUndo(doc, "pause", clock), items, sessions };
}

export function completeTask(doc: StoreDocument, taskId: string, clock: Clock): StoreDocument {
  const now = clock.now();
  const items = doc.items.map((item) => {
    if (item.id !== taskId || !isTask(item)) return item;
    const extra = item.status === "running" ? elapsedMinutes(doc, item, now) : 0;
    return {
      ...item,
      status: "completed" as const,
      actualMinutes: item.actualMinutes + extra,
      updatedAt: iso(now),
    };
  });
  const sessions = doc.sessions.map((session) =>
    session.taskId === taskId && session.endedAt === null
      ? { ...session, endedAt: iso(now) }
      : session,
  );
  return { ...withUndo(doc, "complete", clock), items, sessions };
}

function elapsedMinutes(doc: StoreDocument, task: Task, now: Date): number {
  const open = [...doc.sessions]
    .reverse()
    .find((session) => session.taskId === task.id && !session.endedAt);
  if (!open) return 0;
  return Math.max(0, Math.round((now.getTime() - new Date(open.startedAt).getTime()) / 60000));
}

export function runningElapsed(doc: StoreDocument, task: Task, now: Date): number {
  return task.actualMinutes + (task.status === "running" ? elapsedMinutes(doc, task, now) : 0);
}

export function scheduleTask(
  doc: StoreDocument,
  taskId: string,
  start: Date,
  clock: Clock,
): StoreDocument {
  const items = doc.items.map((item) => {
    if (item.id !== taskId || !isTask(item)) return item;
    const minutes = item.estimatedMinutes ?? 30;
    return {
      ...item,
      status: "planned" as const,
      scheduledStart: start.toISOString(),
      scheduledEnd: new Date(start.getTime() + minutes * 60000).toISOString(),
      updatedAt: iso(clock.now()),
    };
  });
  return { ...withUndo(doc, "schedule", clock), items };
}

export function acceptPlan(doc: StoreDocument, clock: Clock): StoreDocument {
  const proposal = proposeDayPlan(doc, clock.now());
  let next = withUndo(doc, "plan", clock);
  for (const move of proposal.moves) {
    next = {
      ...next,
      items: next.items.map((item) => {
        if (item.id !== move.taskId || !isTask(item)) return item;
        return {
          ...item,
          status: "planned" as const,
          scheduledStart: move.scheduledStart,
          scheduledEnd: move.scheduledEnd,
          updatedAt: iso(clock.now()),
        };
      }),
    };
  }
  return next;
}

export function setEstimate(
  doc: StoreDocument,
  taskId: string,
  minutes: number,
  clock: Clock,
): StoreDocument {
  return {
    ...doc,
    items: doc.items.map((item) =>
      item.id === taskId && isTask(item)
        ? { ...item, estimatedMinutes: minutes, updatedAt: iso(clock.now()) }
        : item,
    ),
  };
}

export function moveToInbox(doc: StoreDocument, taskId: string, clock: Clock): StoreDocument {
  return replaceItem(
    withUndo(doc, "inbox", clock),
    mapTask(doc, taskId, (task) => ({
      ...task,
      status: "inbox",
      scheduledStart: null,
      scheduledEnd: null,
      sometime: false,
      updatedAt: iso(clock.now()),
    })),
  );
}

export function moveToTomorrow(doc: StoreDocument, taskId: string, clock: Clock): StoreDocument {
  const start = new Date(clock.now());
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  return scheduleTask(doc, taskId, start, clock);
}

export function moveUnfinishedToTomorrow(
  doc: StoreDocument,
  taskIds: string[],
  clock: Clock,
): StoreDocument {
  return taskIds.reduce((next, id) => moveToTomorrow(next, id, clock), doc);
}

export function leaveUnfinishedInInbox(
  doc: StoreDocument,
  taskIds: string[],
  clock: Clock,
): StoreDocument {
  return taskIds.reduce((next, id) => moveToInbox(next, id, clock), doc);
}

export function deleteItem(doc: StoreDocument, id: string, clock: Clock): StoreDocument {
  return { ...withUndo(doc, "delete", clock), items: doc.items.filter((item) => item.id !== id) };
}

export function pinNote(
  doc: StoreDocument,
  noteId: string,
  pinned: boolean,
  clock: Clock,
): StoreDocument {
  const pinnedCount = doc.items.filter((item) => isNote(item) && item.pinnedToday).length;
  if (pinned && pinnedCount >= MAX_PINNED) return doc;
  return {
    ...doc,
    items: doc.items.map((item) =>
      item.id === noteId && isNote(item)
        ? { ...item, pinnedToday: pinned, updatedAt: iso(clock.now()) }
        : item,
    ),
  };
}

export function convertNoteToTask(doc: StoreDocument, noteId: string, clock: Clock): StoreDocument {
  const note = doc.items.find((item): item is Note => item.id === noteId && isNote(item));
  if (!note) return doc;
  const now = iso(clock.now());
  const task: Task = {
    id: createId(),
    kind: "task",
    title: note.title,
    createdAt: now,
    updatedAt: now,
    projectId: note.projectId,
    areaId: note.areaId,
    tags: note.tags,
    source: { kind: "local" },
    status: "inbox",
    estimatedMinutes: null,
    actualMinutes: 0,
    scheduledStart: null,
    scheduledEnd: null,
    deadline: null,
    deadlineKind: "none",
    priority: "normal",
    notes: note.body,
    parentTaskId: null,
    dependsOn: [],
    flexibility: "flexible",
    interruptible: true,
    sometime: false,
    waitingFor: null,
  };
  const linked: Note = { ...note, linkedItemIds: [...note.linkedItemIds, task.id], updatedAt: now };
  return {
    ...withUndo(doc, "convert", clock),
    items: [...doc.items.map((item) => (item.id === note.id ? linked : item)), task],
  };
}

export function addProject(doc: StoreDocument, name: string, clock: Clock): StoreDocument {
  const project: Project = {
    id: createId(),
    name,
    areaId: null,
    createdAt: iso(clock.now()),
  };
  return { ...doc, projects: [...doc.projects, project] };
}

export function addNote(
  doc: StoreDocument,
  title: string,
  body: string,
  clock: Clock,
): StoreDocument {
  const now = iso(clock.now());
  const note: Note = {
    id: createId(),
    kind: "note",
    title,
    body,
    createdAt: now,
    updatedAt: now,
    projectId: null,
    areaId: null,
    tags: [],
    source: { kind: "local" },
    noteType: "freeform",
    pinnedToday: false,
    linkedItemIds: [],
  };
  return { ...doc, items: [...doc.items, note] };
}

export function searchItems(doc: StoreDocument, query: string): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return doc.items.filter((item) => {
    const blob =
      `${item.title} ${isNote(item) ? item.body : ""} ${isTask(item) ? item.notes : ""}`.toLowerCase();
    return blob.includes(q);
  });
}

function mapTask(doc: StoreDocument, taskId: string, fn: (task: Task) => Task): Task {
  const task = doc.items.find((item): item is Task => item.id === taskId && isTask(item));
  if (!task) throw new Error("task not found");
  return fn(task);
}

export function appendTaskNote(
  doc: StoreDocument,
  taskId: string,
  line: string,
  clock: Clock,
): StoreDocument {
  return {
    ...doc,
    items: doc.items.map((item) =>
      item.id === taskId && isTask(item)
        ? {
            ...item,
            notes: item.notes ? `${item.notes}\n${line}` : line,
            updatedAt: iso(clock.now()),
          }
        : item,
    ),
  };
}
