"use client";

import { useLocale, useTranslations } from "next-intl";
import { DaylineIcon } from "@/components/icons";
import { occurrenceTone, toneIcon, TONE_CLASS } from "@/components/timeline/tone";
import { formatClockRange } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/types";

export function EventCard({ event }: { event: CalendarEvent; time?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const occurrence = {
    id: event.id,
    kind: "event" as const,
    start: new Date(event.start),
    end: new Date(event.end),
    task: null,
    event,
  };
  const tone = occurrenceTone(occurrence);
  return (
    <article className={`relative ms-2 ${TONE_CLASS[tone]}`}>
      <p className="type-time">{formatClockRange(occurrence.start, occurrence.end, locale)}</p>
      <p className="type-title mt-0.5 flex items-center gap-1.5 text-ink">
        <DaylineIcon name={toneIcon(tone, "event")} className="h-3.5 w-3.5" />
        {event.title}
      </p>
      {event.location ? <p className="type-caption mt-1">{event.location}</p> : null}
      <span className="sr-only">{t("kind.fixed")}</span>
    </article>
  );
}
