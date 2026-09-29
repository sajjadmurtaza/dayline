"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  attachBookmark,
  createBookmark,
  createFolder,
  deleteBookmark,
  deleteFolder,
  detachBookmark,
  moveBookmark,
  renameFolder,
  updateBookmark,
} from "@/domains/bookmarks/bookmarks";
import { acceptBookmarkImport, type NetscapePreview } from "@/domains/bookmarks/netscape";
import {
  applyWindow,
  commitParsedEvents,
  disconnectGoogle,
  markGoogleSyncFailure,
  privatePrepTask,
  rememberedFeed,
  rememberedFile,
  removeCalendarFeed,
  removeCalendarFile,
  setSelectedGoogleCalendars,
  sourceForFeed,
  sourceForFile,
  sourceForGoogle,
} from "@/domains/calendars/apply";
import type { ParsedCalendarEvent } from "@/domains/calendars/ics";
import { createId } from "@/lib/id";
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
  acceptPlacement,
  cancelFixedEvent,
  shiftFixedEvent,
  type EventShift,
  type PlacementCue,
  type PlacementProposal,
} from "@/domains/planning/time-kinds";
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
import type { Bookmark, PauseReason, StoreDocument } from "@/lib/types";
import { isNote, isTask } from "@/lib/types";

type DaylineContextValue = {
  doc: StoreDocument;
  hydrated: boolean;
  now: Date;
  capture: (text: string) => void;
  start: (taskId: string) => void;
  pause: (taskId: string, reason?: PauseReason | null) => void;
  complete: (taskId: string) => void;
  schedule: (taskId: string, start: Date) => void;
  place: (proposal: PlacementProposal) => void;
  reflow: EventShift | null;
  opened: { title: string; cue: PlacementCue } | null;
  importShift: (eventId: string, toStart: Date, toEnd: Date) => void;
  importCancel: (eventId: string) => void;
  acceptReflow: () => void;
  keepReflow: () => void;
  acceptOpened: () => void;
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
  saveBookmark: (
    input: { title: string; url: string; note?: string; tags?: string[]; folderId?: string | null },
    attachTo?: { kind: "task" | "project" | "note"; id: string } | null,
  ) => { doc: StoreDocument; bookmark: Bookmark; created: boolean } | null;
  editBookmark: (
    id: string,
    patch: Partial<Pick<Bookmark, "title" | "url" | "note" | "tags" | "pinned" | "archived">>,
    folderId?: string | null,
  ) => void;
  removeBookmark: (id: string) => void;
  saveFolder: (name: string, parentId?: string | null) => void;
  editFolder: (id: string, name: string) => void;
  removeFolder: (id: string) => void;
  moveBookmark: (bookmarkId: string, fromFolderId: string | null, toFolderId: string | null) => void;
  attachBookmark: (bookmarkId: string, target: { kind: "task" | "project" | "note"; id: string }) => void;
  detachBookmark: (attachmentId: string) => void;
  acceptImport: (preview: NetscapePreview, folders: string[] | null) => void;
  importIcsFile: (filename: string, name: string, events: ParsedCalendarEvent[]) => void;
  importFeed: (url: string, name: string, events: ParsedCalendarEvent[], feedId?: string, secret?: boolean) => void;
  removeFile: (importId: string) => void;
  removeFeed: (feedId: string) => void;
  saveGoogleConnection: (connection: NonNullable<StoreDocument["googleConnection"]>) => void;
  chooseGoogleCalendars: (ids: string[]) => void;
  noteGoogleFailure: (message: string) => void;
  importGoogleEvents: (batches: { calendarId: string; events: ParsedCalendarEvent[] }[]) => void;
  syncExternalCalendars: (input: {
    google: { batches: { calendarId: string; events: ParsedCalendarEvent[] }[]; error: string | null } | null;
    feeds: { id: string; url: string; name: string; secret?: boolean; events: ParsedCalendarEvent[] | null; error: string | null }[];
  }) => void;
  disconnectCalendar: () => void;
  addPrep: (eventId: string) => void;
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
  const [reflow, setReflow] = useState<EventShift | null>(null);
  const [opened, setOpened] = useState<{ title: string; cue: PlacementCue } | null>(null);

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
      hydrated,
      now,
      capture: (text) => commit(captureText(doc, text, clock)),
      start: (taskId) => commit(startTask(doc, taskId, clock)),
      pause: (taskId, reason = null) => commit(pauseTask(doc, taskId, reason, clock)),
      complete: (taskId) => commit(completeTask(doc, taskId, clock)),
      schedule: (taskId, startAt) => commit(scheduleTask(doc, taskId, startAt, clock)),
      place: (proposal) => commit(acceptPlacement(doc, proposal, clock)),
      reflow,
      opened,
      importShift: (eventId, toStart, toEnd) => {
        const shift = shiftFixedEvent(doc, eventId, toStart, toEnd);
        if (!shift) return;
        commit(shift.doc);
        setReflow(shift.reflow ? shift : null);
      },
      importCancel: (eventId) => {
        const result = cancelFixedEvent(doc, eventId);
        commit(result.doc);
        setOpened(result.cue && result.title ? { title: result.title, cue: result.cue } : null);
      },
      acceptReflow: () => {
        if (!reflow?.reflow) return;
        commit(acceptPlacement(doc, reflow.reflow, clock));
        setReflow(null);
      },
      keepReflow: () => setReflow(null),
      acceptOpened: () => {
        if (!opened) return;
        commit(acceptPlacement(doc, opened.cue.proposal, clock));
        setOpened(null);
      },
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
      saveBookmark: (
        input: {
          title: string;
          url: string;
          note?: string;
          tags?: string[];
          folderId?: string | null;
        },
        attachTo?: { kind: "task" | "project" | "note"; id: string } | null,
      ) => {
        const saved = createBookmark(doc, input, now.getTime());
        if (!saved) return null;
        commit(attachTo ? attachBookmark(saved.doc, saved.bookmark.id, attachTo, now.getTime()) : saved.doc);
        return saved;
      },
      editBookmark: (
        id: string,
        patch: Parameters<typeof updateBookmark>[2],
        folderId?: string | null,
      ) => {
        const next = updateBookmark(doc, id, patch, now.getTime());
        commit(folderId ? moveBookmark(next, id, null, folderId) : next);
      },
      removeBookmark: (id: string) => commit(deleteBookmark(doc, id)),
      saveFolder: (name: string, parentId: string | null = null) =>
        commit(createFolder(doc, name, parentId, now.getTime())),
      editFolder: (id: string, name: string) => commit(renameFolder(doc, id, name, now.getTime())),
      removeFolder: (id: string) => commit(deleteFolder(doc, id)),
      moveBookmark: (bookmarkId: string, fromFolderId: string | null, toFolderId: string | null) =>
        commit(moveBookmark(doc, bookmarkId, fromFolderId, toFolderId)),
      attachBookmark: (bookmarkId: string, target: { kind: "task" | "project" | "note"; id: string }) =>
        commit(attachBookmark(doc, bookmarkId, target, now.getTime())),
      detachBookmark: (attachmentId: string) => commit(detachBookmark(doc, attachmentId)),
      acceptImport: (preview: NetscapePreview, folders: string[] | null) =>
        commit(acceptBookmarkImport(doc, preview, folders)),
      importIcsFile: (filename, name, events) => {
        const id = createId();
        const applied = commitParsedEvents(doc, events, (externalId) => sourceForFile(id, externalId), clock);
        commit(rememberedFile(applied.doc, { id, filename, name, eventCount: events.length }, clock));
        if (applied.shifts[0]) setReflow(applied.shifts[0]);
        if (applied.opened) setOpened(applied.opened);
      },
      importFeed: (url, name, events, feedId, secret = false) => {
        const id = feedId ?? createId();
        const applied = applyWindow(doc, events, (externalId) => sourceForFeed(id, externalId), (source) => source.kind === "calendar-feed" && source.feedId === id, clock);
        commit(rememberedFeed(applied.doc, { id, url, name, secret }, clock));
        if (applied.shifts[0]) setReflow(applied.shifts[0]);
        if (applied.opened) setOpened(applied.opened);
      },
      removeFile: (importId) => commit(removeCalendarFile(doc, importId)),
      removeFeed: (feedId) => commit(removeCalendarFeed(doc, feedId)),
      saveGoogleConnection: (connection) => commit({ ...doc, googleConnection: connection }),
      chooseGoogleCalendars: (ids) => commit(setSelectedGoogleCalendars(doc, ids)),
      noteGoogleFailure: (message) => commit(markGoogleSyncFailure(doc, message)),
      importGoogleEvents: (batches) => {
        let next = doc;
        let shift: EventShift | null = null;
        let gained: { title: string; cue: PlacementCue } | null = null;
        for (const batch of batches) {
          const applied = applyWindow(
            next,
            batch.events,
            (externalId) => sourceForGoogle(externalId, batch.calendarId),
            (source) =>
              source.kind === "connector" && source.connectorId === "google-calendar" && source.calendarId === batch.calendarId,
            clock,
          );
          next = applied.doc;
          shift = shift ?? applied.shifts[0] ?? null;
          gained = gained ?? applied.opened;
        }
        const stamped = next.googleConnection
          ? {
              ...next,
              googleConnection: {
                ...next.googleConnection,
                lastSyncedAt: clock.now().getTime(),
                lastError: null,
              },
            }
          : next;
        commit(stamped);
        if (shift) setReflow(shift);
        if (gained) setOpened(gained);
      },
      syncExternalCalendars: ({ google, feeds }) => {
        let next = doc;
        let shift: EventShift | null = null;
        let gained: { title: string; cue: PlacementCue } | null = null;
        if (google?.error && next.googleConnection) next = markGoogleSyncFailure(next, google.error);
        if (google && !google.error) {
          for (const batch of google.batches) {
            const applied = applyWindow(
              next,
              batch.events,
              (externalId) => sourceForGoogle(externalId, batch.calendarId),
              (source) => source.kind === "connector" && source.connectorId === "google-calendar" && source.calendarId === batch.calendarId,
              clock,
            );
            next = applied.doc;
            shift = shift ?? applied.shifts[0] ?? null;
            gained = gained ?? applied.opened;
          }
          if (next.googleConnection) {
            next = {
              ...next,
              googleConnection: { ...next.googleConnection, lastSyncedAt: clock.now().getTime(), lastError: null },
            };
          }
        }
        for (const feed of feeds) {
          if (feed.events && !feed.error) {
            const applied = applyWindow(
              next,
              feed.events,
              (externalId) => sourceForFeed(feed.id, externalId),
              (source) => source.kind === "calendar-feed" && source.feedId === feed.id,
              clock,
            );
            next = rememberedFeed(applied.doc, { id: feed.id, url: feed.url, name: feed.name, secret: feed.secret }, clock);
            shift = shift ?? applied.shifts[0] ?? null;
            gained = gained ?? applied.opened;
          } else if (feed.error) {
            next = rememberedFeed(next, { id: feed.id, url: feed.url, name: feed.name, secret: feed.secret }, clock, feed.error);
          }
        }
        commit(next);
        if (shift) setReflow(shift);
        if (gained) setOpened(gained);
      },
      disconnectCalendar: () => commit(disconnectGoogle(doc)),
      addPrep: (eventId) => commit(privatePrepTask(doc, eventId, clock)),
      tomorrowAll: (taskIds) => commit(moveUnfinishedToTomorrow(doc, taskIds, clock)),
      inboxAll: (taskIds) => commit(leaveUnfinishedInInbox(doc, taskIds, clock)),
      dismissNotice: (id) =>
        setDismissedNoticeIds((ids) => (ids.includes(id) ? ids : [...ids, id])),
      dismissedNoticeIds,
    }),
    [clock, commit, dismissedNoticeIds, doc, hydrated, now, opened, reflow],
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
