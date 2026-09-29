"use client";

import { useLocale, useTranslations } from "next-intl";
import { DaylineIcon } from "@/components/icons";
import { occurrenceTone, toneIcon, TONE_CLASS } from "@/components/timeline/tone";
import { ReadOnlyEvent } from "@/components/external-event-detail";
import { faceClass, isExternallyManagedEvent, isReservedLunch, showsCalendarIcon } from "@/domains/planning/time-kinds";
import { formatClockRange } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/types";

export function EventCard({ event }: { event: CalendarEvent; time?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const today = useTranslations("app.today");
  const calendar = showsCalendarIcon(event);
  const reserved = isReservedLunch(event);
  const occurrence = {
    id: event.id,
    kind: "event" as const,
    start: new Date(event.start),
    end: new Date(event.end),
    task: null,
    event,
  };
  const tone = occurrenceTone(occurrence);
  const card = (
    <article className={`relative ms-2 ${TONE_CLASS[tone]} ${faceClass("fixed")}`}>
      <p className="type-time">{formatClockRange(occurrence.start, occurrence.end, locale)}</p>
      <p className="type-title mt-0.5 flex items-center gap-1.5 text-ink">
        {calendar ? <DaylineIcon name="calendar" className="h-3.5 w-3.5" /> : null}
        {!calendar ? <DaylineIcon name={toneIcon(tone, "event")} className="h-3.5 w-3.5" /> : null}
        {event.title}
      </p>
      {reserved ? <p className="type-caption mt-1">{today("reserved")}</p> : null}
      {event.location ? <p className="type-caption mt-1">{event.location}</p> : null}
      <span className="sr-only">{t("kind.fixed")}</span>
    </article>
  );
  return isExternallyManagedEvent(event) ? <ReadOnlyEvent event={event}>{card}</ReadOnlyEvent> : card;
}
