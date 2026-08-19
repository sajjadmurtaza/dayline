"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parseCapture } from "@/domains/capture/parse";
import { processBrainDump } from "@/domains/brain-dump/process";
import { buildDaySnapshot } from "@/domains/planning/day-view";
import {
  eventsOnDay,
  proposeDayPlan,
  tasksOnDay,
  unscheduledTasks,
} from "@/domains/planning/engine";
import {
  acceptPlan,
  appendTaskNote,
  applyBrainDump,
  captureText,
  completeTask,
  convertNoteToTask,
  deleteItem,
  leaveUnfinishedInInbox,
  moveToInbox,
  moveToTomorrow,
  moveUnfinishedToTomorrow,
  pauseTask,
  pinNote,
  runningElapsed,
  scheduleTask,
  searchItems,
  setEstimate,
  startTask,
  undoLast,
  addNote,
  addProject,
} from "@/domains/workspace/commands";
import { seedDemo } from "@/domains/workspace/seed";
import { systemClock, type Clock } from "@/lib/clock";
import { emptyStore, LocalStorageAdapter, Repository } from "@/lib/store/repository";
import type { PauseReason, StoreDocument } from "@/lib/types";
import { isNote, isTask } from "@/lib/types";

type DaylineContextValue = {
  doc: StoreDocument;
  now: Date;
  capture: (text: string) => void;
  start: (taskId: string) => void;
  pause: (taskId: string, reason?: PauseReason | null) => void;
  complete: (taskId: string) => void;
  schedule: (taskId: string, start: Date) => void;
  estimate: (taskId: string, minutes: number) => void;
  planDay: () => void;
  undo: () => void;
  resetDemo: () => void;
  pin: (noteId: string, pinned: boolean) => void;
  noteToTask: (noteId: string) => void;
  dump: (text: string, selected: boolean[]) => void;
  inbox: (taskId: string) => void;
  tomorrow: (taskId: string) => void;
  remove: (id: string) => void;
  noteLine: (taskId: string, line: string) => void;
  newProject: (name: string) => void;
  newNote: (title: string, body: string) => void;
  tomorrowAll: (taskIds: string[]) => void;
  inboxAll: (taskIds: string[]) => void;
  dismissNotice: (id: string) => void;
  dismissedNoticeIds: string[];
};

const DaylineContext = createContext<DaylineContextValue | null>(null);

export function DaylineProvider({
  children,
  clock = systemClock,
}: {
  children: React.ReactNode;
  clock?: Clock;
}) {
  const repo = useMemo(() => new Repository(new LocalStorageAdapter()), []);
  const [doc, setDoc] = useState<StoreDocument>(emptyStore);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => clock.now());
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<string[]>([]);

  useEffect(() => {
    const loaded = repo.load();
    // localStorage is client-only; keep first paint identical on server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from persistence
    setDoc(loaded.seeded ? loaded : seedDemo(clock));
    setHydrated(true);
  }, [clock, repo]);

  useEffect(() => {
    if (!hydrated) return;
    repo.save(doc);
  }, [doc, hydrated, repo]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(clock.now()), 1000);
    return () => window.clearInterval(id);
  }, [clock]);

  const commit = useCallback((next: StoreDocument) => setDoc(next), []);

  const value = useMemo<DaylineContextValue>(
    () => ({
      doc,
      now,
      capture: (text) => commit(captureText(doc, text, clock)),
      start: (taskId) => commit(startTask(doc, taskId, clock)),
      pause: (taskId, reason = null) => commit(pauseTask(doc, taskId, reason, clock)),
      complete: (taskId) => commit(completeTask(doc, taskId, clock)),
      schedule: (taskId, startAt) => commit(scheduleTask(doc, taskId, startAt, clock)),
      estimate: (taskId, minutes) => commit(setEstimate(doc, taskId, minutes, clock)),
      planDay: () => commit(acceptPlan(doc, clock)),
      undo: () => commit(undoLast(doc)),
      resetDemo: () => commit(seedDemo(clock)),
      pin: (noteId, pinned) => commit(pinNote(doc, noteId, pinned, clock)),
      noteToTask: (noteId) => commit(convertNoteToTask(doc, noteId, clock)),
      dump: (text, selected) => commit(applyBrainDump(doc, text, selected, clock)),
      inbox: (taskId) => commit(moveToInbox(doc, taskId, clock)),
      tomorrow: (taskId) => commit(moveToTomorrow(doc, taskId, clock)),
      remove: (id) => commit(deleteItem(doc, id, clock)),
      noteLine: (taskId, line) => commit(appendTaskNote(doc, taskId, line, clock)),
      newProject: (name) => commit(addProject(doc, name, clock)),
      newNote: (title, body) => commit(addNote(doc, title, body, clock)),
      tomorrowAll: (taskIds) => commit(moveUnfinishedToTomorrow(doc, taskIds, clock)),
      inboxAll: (taskIds) => commit(leaveUnfinishedInInbox(doc, taskIds, clock)),
      dismissNotice: (id) =>
        setDismissedNoticeIds((ids) => (ids.includes(id) ? ids : [...ids, id])),
      dismissedNoticeIds,
    }),
    [clock, commit, dismissedNoticeIds, doc, now],
  );

  return <DaylineContext.Provider value={value}>{children}</DaylineContext.Provider>;
}

export function useDayline() {
  const ctx = useContext(DaylineContext);
  if (!ctx) throw new Error("useDayline requires DaylineProvider");
  return ctx;
}

export function useTodayModel() {
  const { doc, now, dismissedNoticeIds } = useDayline();
  const elapsed = (taskId: string) => {
    const task = doc.items.find((item) => item.id === taskId);
    return task && isTask(task) ? runningElapsed(doc, task, now) : 0;
  };
  const raw = buildDaySnapshot(doc, now, elapsed);
  const snapshot =
    raw.notice && dismissedNoticeIds.includes(raw.notice.id) ? { ...raw, notice: null } : raw;
  return {
    events: eventsOnDay(doc, now),
    tasks: tasksOnDay(doc, now),
    unscheduled: unscheduledTasks(doc).filter((task) => !task.sometime),
    sometime: doc.items
      .filter(isTask)
      .filter((task) => task.sometime && task.status !== "completed"),
    pinned: doc.items
      .filter(isNote)
      .filter((note) => note.pinnedToday)
      .slice(0, 3),
    running: doc.items.filter(isTask).find((task) => task.status === "running") ?? null,
    proposal: proposeDayPlan(doc, now),
    advice: snapshot.advice,
    snapshot,
    elapsed,
  };
}

export function previewCapture(text: string, now: Date) {
  return parseCapture(text, now);
}

export function previewDump(text: string, now: Date) {
  return processBrainDump(text, now);
}

export function searchDoc(doc: StoreDocument, q: string) {
  return searchItems(doc, q);
}
