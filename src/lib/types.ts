import { z } from "zod";

export const TASK_STATUSES = [
  "inbox",
  "planned",
  "ready",
  "running",
  "paused",
  "completed",
  "deferred",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEADLINE_KINDS = ["none", "target", "due"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

export const NOTE_TYPES = [
  "idea",
  "remember",
  "question",
  "research",
  "meeting",
  "personal",
  "temporary",
  "freeform",
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const AREA_IDS = ["work", "study", "health", "finance", "family", "personal"] as const;
export type AreaId = (typeof AREA_IDS)[number];

export const PAUSE_REASONS = ["meeting", "phone", "break", "other"] as const;
export type PauseReason = (typeof PAUSE_REASONS)[number];

export const sourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("local") }),
  z.object({ kind: z.literal("local-rule"), rule: z.literal("lunch") }),
  z.object({
    kind: z.literal("connector"),
    connectorId: z.string(),
    externalId: z.string(),
    calendarId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("calendar-import"),
    importer: z.literal("ics-file"),
    externalId: z.string(),
    importId: z.string(),
  }),
  z.object({
    kind: z.literal("calendar-feed"),
    feedId: z.string(),
    externalId: z.string(),
  }),
]);
export type ItemSource = z.infer<typeof sourceSchema>;

const itemBase = {
  id: z.string(),
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  projectId: z.string().nullable(),
  areaId: z.enum(AREA_IDS).nullable(),
  tags: z.array(z.string()),
  source: sourceSchema,
};

export const taskSchema = z.object({
  ...itemBase,
  kind: z.literal("task"),
  status: z.enum(TASK_STATUSES),
  estimatedMinutes: z.number().positive().nullable(),
  actualMinutes: z.number().nonnegative(),
  scheduledStart: z.string().nullable(),
  scheduledEnd: z.string().nullable(),
  deadline: z.string().nullable(),
  deadlineKind: z.enum(DEADLINE_KINDS),
  priority: z.enum(PRIORITIES),
  notes: z.string(),
  parentTaskId: z.string().nullable(),
  dependsOn: z.array(z.string()),
  flexibility: z.literal("flexible"),
  interruptible: z.boolean(),
  sometime: z.boolean(),
  waitingFor: z.string().nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const eventSchema = z.object({
  ...itemBase,
  kind: z.literal("event"),
  start: z.string(),
  end: z.string(),
  location: z.string().nullable(),
  conferenceUrl: z.string().nullable(),
  description: z.string(),
  flexibility: z.literal("fixed"),
  participation: z.enum(["accepted", "declined", "tentative", "needsAction"]).optional(),
  allDay: z.boolean().optional(),
  calendarPlacement: z.enum(["spine", "quiet", "hidden"]).optional(),
  calendarName: z.string().optional(),
  organizer: z.string().nullable().optional(),
  sourceUrl: z.string().optional(),
});
export type CalendarEvent = z.infer<typeof eventSchema>;

export const noteSchema = z.object({
  ...itemBase,
  kind: z.literal("note"),
  body: z.string(),
  noteType: z.enum(NOTE_TYPES),
  pinnedToday: z.boolean(),
  linkedItemIds: z.array(z.string()),
});
export type Note = z.infer<typeof noteSchema>;

export const reminderSchema = z.object({
  ...itemBase,
  kind: z.literal("reminder"),
  remindAt: z.string(),
  linkedItemId: z.string().nullable(),
  done: z.boolean(),
});
export type Reminder = z.infer<typeof reminderSchema>;

export const itemSchema = z.discriminatedUnion("kind", [
  taskSchema,
  eventSchema,
  noteSchema,
  reminderSchema,
]);
export type Item = z.infer<typeof itemSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  areaId: z.enum(AREA_IDS).nullable(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  pauseReason: z.enum(PAUSE_REASONS).nullable(),
});
export type TimeSession = z.infer<typeof sessionSchema>;

export const workingHoursSchema = z.object({
  startMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  endMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  lunchStartMinutes: z.number().int(),
  lunchEndMinutes: z.number().int(),
});
export type WorkingHours = z.infer<typeof workingHoursSchema>;

export const undoEntrySchema = z.object({
  label: z.string(),
  snapshot: z.string(),
  at: z.string(),
});
export type UndoEntry = z.infer<typeof undoEntrySchema>;

export const bookmarkSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dayline") }),
  z.object({
    kind: z.literal("browser-import"),
    importer: z.literal("netscape-html"),
    importedAt: z.number(),
  }),
]);
export type BookmarkSource = z.infer<typeof bookmarkSourceSchema>;

export const bookmarkSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().min(1),
  normalizedUrl: z.string().min(1),
  domain: z.string(),
  note: z.string().optional(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  archived: z.boolean(),
  source: bookmarkSourceSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  chromeAddedAt: z.number().optional(),
  isLocalFile: z.boolean(),
});
export type Bookmark = z.infer<typeof bookmarkSchema>;

export const bookmarkFolderSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  parentId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type BookmarkFolder = z.infer<typeof bookmarkFolderSchema>;

export const bookmarkPlacementSchema = z.object({
  bookmarkId: z.string(),
  folderId: z.string(),
});
export type BookmarkFolderPlacement = z.infer<typeof bookmarkPlacementSchema>;

export const bookmarkAttachmentSchema = z.object({
  id: z.string(),
  bookmarkId: z.string(),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("task"), id: z.string() }),
    z.object({ kind: z.literal("project"), id: z.string() }),
    z.object({ kind: z.literal("note"), id: z.string() }),
  ]),
  createdAt: z.number(),
});
export type BookmarkAttachment = z.infer<typeof bookmarkAttachmentSchema>;

export const googleCalendarSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type GoogleCalendarChoice = z.infer<typeof googleCalendarSchema>;

export const googleConnectionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  expiresAt: z.number(),
  email: z.string().nullable(),
  selectedCalendarIds: z.array(z.string()),
  calendars: z.array(googleCalendarSchema),
  lastSyncedAt: z.number().nullable(),
  lastError: z.string().nullable(),
});
export type GoogleConnection = z.infer<typeof googleConnectionSchema>;

export const calendarFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  name: z.string(),
  importedAt: z.number(),
  eventCount: z.number(),
});
export type CalendarFileImport = z.infer<typeof calendarFileSchema>;

export const calendarFeedSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  lastSyncedAt: z.number().nullable(),
  lastError: z.string().nullable(),
  secret: z.boolean().default(false),
});
export type CalendarFeed = z.infer<typeof calendarFeedSchema>;

export const STORE_VERSION = 1 as const;

export const storeDocumentSchema = z.object({
  version: z.literal(STORE_VERSION),
  items: z.array(itemSchema),
  projects: z.array(projectSchema),
  sessions: z.array(sessionSchema),
  workingHours: workingHoursSchema,
  undo: z.array(undoEntrySchema),
  seeded: z.boolean(),
  bookmarkFolders: z.array(bookmarkFolderSchema).default([]),
  bookmarks: z.array(bookmarkSchema).default([]),
  bookmarkPlacements: z.array(bookmarkPlacementSchema).default([]),
  bookmarkAttachments: z.array(bookmarkAttachmentSchema).default([]),
  googleConnection: googleConnectionSchema.nullable().default(null),
  calendarFiles: z.array(calendarFileSchema).default([]),
  calendarFeeds: z.array(calendarFeedSchema).default([]),
});
export type StoreDocument = z.infer<typeof storeDocumentSchema>;

export function isTask(item: Item): item is Task {
  return item.kind === "task";
}
export function isEvent(item: Item): item is CalendarEvent {
  return item.kind === "event";
}
export function isNote(item: Item): item is Note {
  return item.kind === "note";
}

export const DURATION_PRESETS = [5, 10, 15, 25, 30, 45, 60, 90, 120] as const;
