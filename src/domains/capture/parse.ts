import type { Item, NoteType, Priority } from "@/lib/types";
import { addDays, atTime, startOfDay } from "@/lib/clock";

export type CaptureKind = Item["kind"];

export type CaptureSuggestion = {
  kind: CaptureKind;
  title: string;
  estimatedMinutes: number | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  noteType: NoteType | null;
  priority: Priority;
  sometime: boolean;
  uncertainTime: boolean;
};

const DURATION = /(\d+)\s*(h(?:ours?)?|hours?|m(?:in(?:utes?)?)?)/i;
const AT_TIME = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
const IDEA = /^(idea|remember|question)\s*[:：]\s*/i;

function typedDuration(title: string): number | null {
  const match = title.match(DURATION);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("h")) return n * 60;
  return n;
}

function guessDuration(title: string): number | null {
  return typedDuration(title) ?? heuristicEstimate(title);
}

function heuristicEstimate(title: string): number | null {
  const t = title.toLowerCase();
  if (/\b(email|reply|call|buy|book)\b/.test(t)) return 15;
  if (/\b(review|read|study)\b/.test(t)) return 45;
  if (/\b(prepare|write|draft|proposal|report)\b/.test(t)) return 60;
  return null;
}

function parseWhen(text: string, now: Date): { start: Date | null; uncertain: boolean } {
  const lower = text.toLowerCase();
  let day = startOfDay(now);
  if (/\btomorrow\b/.test(lower)) day = addDays(day, 1);
  else if (/\bfriday\b/.test(lower)) day = nextWeekday(now, 5);
  else if (!/\btoday\b/.test(lower) && !AT_TIME.test(text)) {
    return { start: null, uncertain: false };
  }

  const time = text.match(AT_TIME);
  if (!time) {
    if (/\btomorrow\b|\btoday\b|\bfriday\b/.test(lower)) {
      return { start: null, uncertain: true };
    }
    return { start: null, uncertain: false };
  }
  let hour = Number(time[1]);
  const minute = time[2] ? Number(time[2]) : 0;
  const mer = time[3]?.toLowerCase();
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return { start: atTime(day, hour, minute), uncertain: false };
}

function nextWeekday(from: Date, weekday: number): Date {
  const day = startOfDay(from);
  const delta = (weekday - day.getDay() + 7) % 7 || 7;
  return addDays(day, delta);
}

export function parseCapture(input: string, now: Date): CaptureSuggestion | null {
  const raw = input.trim();
  if (!raw) return null;

  const idea = raw.match(IDEA);
  if (idea || /^idea\b/i.test(raw)) {
    return {
      kind: "note",
      title: raw.replace(IDEA, "").trim() || raw,
      estimatedMinutes: null,
      scheduledStart: null,
      scheduledEnd: null,
      noteType: "idea",
      priority: "normal",
      sometime: false,
      uncertainTime: false,
    };
  }

  const when = parseWhen(raw, now);
  const typed = typedDuration(raw);
  const estimatedMinutes = guessDuration(raw);
  const title =
    raw
      .replace(DURATION, "")
      .replace(AT_TIME, "")
      .replace(/\b(tomorrow|today|tonight|friday|sometime)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim() || raw;

  const isMeeting = /\b(meeting|call with|lunch with)\b/i.test(raw);
  const sometime = /\bsometime\b/i.test(raw);

  if (isMeeting && when.start) {
    const end = new Date(when.start.getTime() + (estimatedMinutes ?? 60) * 60000);
    return {
      kind: "event",
      title,
      estimatedMinutes: estimatedMinutes ?? 60,
      scheduledStart: when.start.toISOString(),
      scheduledEnd: end.toISOString(),
      noteType: null,
      priority: "normal",
      sometime: false,
      uncertainTime: when.uncertain,
    };
  }

  return {
    kind: "task",
    title,
    estimatedMinutes: typed,
    scheduledStart: when.start ? when.start.toISOString() : null,
    scheduledEnd:
      when.start && typed
        ? new Date(when.start.getTime() + typed * 60000).toISOString()
        : null,
    noteType: null,
    priority: "normal",
    sometime,
    uncertainTime: when.uncertain,
  };
}
