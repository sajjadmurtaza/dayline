import { inWindow, importWindow, type ImportWindow } from "@/domains/calendars/window";

export type ParsedCalendarEvent = {
  uid: string;
  recurrenceId: string | null;
  title: string;
  start: string;
  end: string;
  location: string | null;
  description: string;
  organizer: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  participation: "accepted" | "declined" | "tentative" | "needsAction";
  allDay: boolean;
  categories: string[];
  calendarName: string;
  sourceUrl?: string | null;
};

export type IcsPreview = {
  ok: true;
  name: string;
  events: ParsedCalendarEvent[];
  timed: number;
  allDay: number;
  cancelled: number;
  rangeLabel: "next-7";
};

export type IcsFailure = { ok: false; reason: "malformed" };

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function unfold(raw: string): string[] {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const split = line.indexOf(":");
  if (split < 0) return null;
  const left = line.slice(0, split);
  const value = line.slice(split + 1);
  const [name, ...rawParams] = left.split(";");
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const eq = param.indexOf("=");
    if (eq < 0) continue;
    params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

type Wall = { y: number; m: number; d: number; h: number; min: number; s: number };

function readStamp(value: string): { wall: Wall; utc: boolean; dateOnly: boolean } | null {
  const dateOnly = /^(\d{8})$/.exec(value);
  if (dateOnly) {
    const raw = dateOnly[1];
    return {
      dateOnly: true,
      utc: false,
      wall: {
        y: Number(raw.slice(0, 4)),
        m: Number(raw.slice(4, 6)),
        d: Number(raw.slice(6, 8)),
        h: 0,
        min: 0,
        s: 0,
      },
    };
  }
  const match = /^(\d{8})T(\d{6})(Z)?$/.exec(value);
  if (!match) return null;
  const day = match[1];
  const time = match[2];
  return {
    dateOnly: false,
    utc: match[3] === "Z",
    wall: {
      y: Number(day.slice(0, 4)),
      m: Number(day.slice(4, 6)),
      d: Number(day.slice(6, 8)),
      h: Number(time.slice(0, 2)),
      min: Number(time.slice(2, 4)),
      s: Number(time.slice(4, 6)),
    },
  };
}

function zoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour") % 24, pick("minute"), pick("second"));
  return asUtc - instant.getTime();
}

export function wallTimeToDate(value: string, timeZone: string | null, dateOnly: boolean): Date | null {
  const stamp = readStamp(value);
  if (!stamp) return null;
  const { wall, utc } = stamp;
  if (dateOnly || stamp.dateOnly) {
    return new Date(wall.y, wall.m - 1, wall.d, 0, 0, 0, 0);
  }
  if (utc || !timeZone) {
    if (utc) return new Date(Date.UTC(wall.y, wall.m - 1, wall.d, wall.h, wall.min, wall.s));
    return new Date(wall.y, wall.m - 1, wall.d, wall.h, wall.min, wall.s);
  }
  const guess = new Date(Date.UTC(wall.y, wall.m - 1, wall.d, wall.h, wall.min, wall.s));
  const corrected = new Date(guess.getTime() - zoneOffsetMs(timeZone, guess));
  return new Date(corrected.getTime() - (zoneOffsetMs(timeZone, corrected) - zoneOffsetMs(timeZone, guess)));
}

function addInterval(date: Date, freq: string, interval: number, steps: number): Date {
  const next = new Date(date);
  const amount = interval * steps;
  if (freq === "DAILY") next.setDate(next.getDate() + amount);
  else if (freq === "WEEKLY") next.setDate(next.getDate() + amount * 7);
  else if (freq === "MONTHLY") next.setMonth(next.getMonth() + amount);
  else next.setFullYear(next.getFullYear() + amount);
  return next;
}

function weekdayCode(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

function expandRecurrence(
  start: Date,
  end: Date,
  rule: string,
  window: ImportWindow,
): Array<{ start: Date; end: Date }> {
  const params = Object.fromEntries(
    rule.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key.toUpperCase(), value];
    }),
  );
  const freq = params.FREQ ?? "DAILY";
  const interval = Math.max(1, Number(params.INTERVAL ?? "1") || 1);
  const count = params.COUNT ? Number(params.COUNT) : 400;
  const until = params.UNTIL ? wallTimeToDate(params.UNTIL.replace(/Z$/, "Z"), null, false) : null;
  const byDay = params.BYDAY ? params.BYDAY.split(",") : null;
  const duration = end.getTime() - start.getTime();
  const out: Array<{ start: Date; end: Date }> = [];
  for (let step = 0; step < count && out.length < 80; step += 1) {
    const at = addInterval(start, freq, interval, step);
    if (until && at.getTime() > until.getTime()) break;
    if (byDay && freq === "WEEKLY" && !byDay.includes(weekdayCode(at))) continue;
    if (at.getTime() >= window.end.getTime()) break;
    const finish = new Date(at.getTime() + duration);
    if (inWindow(at, window)) out.push({ start: at, end: finish });
  }
  return out.length ? out : [{ start, end }];
}

type RawEvent = Record<string, { params: Record<string, string>; value: string }>;

function componentName(line: string): string | null {
  const prop = parseProp(line);
  if (!prop || (prop.name !== "BEGIN" && prop.name !== "END")) return null;
  return prop.value.toUpperCase();
}

export function parseIcs(raw: string, now: Date): IcsPreview | IcsFailure {
  if (!/BEGIN:VCALENDAR/i.test(raw) || !/BEGIN:VEVENT/i.test(raw)) return { ok: false, reason: "malformed" };
  const lines = unfold(raw);
  let calendarName = "Calendar";
  const blocks: RawEvent[] = [];
  let current: RawEvent | null = null;
  let depth = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const marker = componentName(line);
    if (marker === "VEVENT" && line.toUpperCase().startsWith("BEGIN")) {
      depth += 1;
      current = {};
      continue;
    }
    if (marker === "VEVENT" && line.toUpperCase().startsWith("END")) {
      depth = Math.max(0, depth - 1);
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    const prop = parseProp(line);
    if (!prop) continue;
    if (!current && depth === 0 && prop.name === "X-WR-CALNAME") calendarName = unescapeText(prop.value);
    if (current && depth > 0) current[prop.name] = { params: prop.params, value: prop.value };
  }
  if (!blocks.length) return { ok: false, reason: "malformed" };

  const window = importWindow(now);
  const events: ParsedCalendarEvent[] = [];
  for (const block of blocks) {
    const uid = block.UID?.value?.trim();
    const startRaw = block.DTSTART;
    if (!uid || !startRaw) continue;
    const dateOnly = (startRaw.params.VALUE ?? "").toUpperCase() === "DATE" || /^\d{8}$/.test(startRaw.value);
    const zone = startRaw.params.TZID ?? null;
    const start = wallTimeToDate(startRaw.value, zone, dateOnly);
    if (!start) continue;
    const endRaw = block.DTEND;
    const end = endRaw
      ? wallTimeToDate(endRaw.value, endRaw.params.TZID ?? zone, (endRaw.params.VALUE ?? "").toUpperCase() === "DATE")
      : new Date(start.getTime() + (dateOnly ? 86_400_000 : 3_600_000));
    if (!end) continue;
    const statusRaw = (block.STATUS?.value ?? "CONFIRMED").toUpperCase();
    const status = statusRaw === "CANCELLED" ? "cancelled" : statusRaw === "TENTATIVE" ? "tentative" : "confirmed";
    const attendee = block.ATTENDEE?.params.PARTSTAT?.toUpperCase();
    const participation =
      attendee === "DECLINED"
        ? "declined"
        : attendee === "TENTATIVE"
          ? "tentative"
          : attendee === "NEEDS-ACTION"
            ? "needsAction"
            : status === "tentative"
              ? "tentative"
              : "accepted";
    const categories = (block.CATEGORIES?.value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const rule = block.RRULE?.value;
    const instances = rule ? expandRecurrence(start, end, rule, window) : [{ start, end }];
    for (const instance of instances) {
      if (!inWindow(instance.start, window, instance.end)) continue;
      events.push({
        uid,
        recurrenceId: rule ? instance.start.toISOString() : block["RECURRENCE-ID"]?.value ?? null,
        title: unescapeText(block.SUMMARY?.value ?? "Untitled"),
        start: instance.start.toISOString(),
        end: instance.end.toISOString(),
        location: block.LOCATION ? unescapeText(block.LOCATION.value) : null,
        description: block.DESCRIPTION ? unescapeText(block.DESCRIPTION.value) : "",
        organizer: block.ORGANIZER ? unescapeText(block.ORGANIZER.value.replace(/^mailto:/i, "")) : null,
        status,
        participation,
        allDay: dateOnly,
        categories,
        calendarName,
      });
    }
  }
  return {
    ok: true,
    name: calendarName,
    events,
    timed: events.filter((event) => !event.allDay && event.status !== "cancelled").length,
    allDay: events.filter((event) => event.allDay).length,
    cancelled: events.filter((event) => event.status === "cancelled").length,
    rangeLabel: "next-7",
  };
}
