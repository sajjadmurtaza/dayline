"use client";

import { useLocale, useTranslations } from "next-intl";
import { useDayline } from "@/components/app-provider";
import { PageTitle } from "@/components/page-title";
import { occurrenceTone, TONE_OBJECT } from "@/components/timeline/tone";
import { addDays, startOfDay } from "@/lib/clock";
import { formatClock, minutesBetweenDates } from "@/lib/dates";
import { calendarTaskState, dayMood, occurrencesOnDay } from "@/domains/planning/day-view";
import { ReadOnlyEvent } from "@/components/external-event-detail";
import { isExternallyManagedEvent } from "@/domains/planning/time-kinds";

export function CalendarView() {
  const t = useTranslations("app.calendar");
  const locale = useLocale();
  const { now, doc } = useDayline();
  const origin = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, index) => addDays(origin, index - 2));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle>{t("title")}</PageTitle>
        <p className="type-caption">{t("week")}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-7 md:gap-3">
        {days.map((day) => {
          const items = occurrencesOnDay(doc, day);
          const isToday = startOfDay(day).getTime() === origin.getTime();
          const isFuture = startOfDay(day).getTime() > origin.getTime();
          const mood = dayMood(doc, day, now);
          const heading = day.toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
          });
          return (
            <section key={day.toISOString()} className="relative min-h-64">
              <header className="mb-2 flex items-baseline gap-2">
                <h2 className="type-heading text-[0.95rem]">{heading}</h2>
                {isToday ? <span className="type-time text-now">{t("todayMark")}</span> : null}
                {!isFuture ? (
                  <span className="type-caption select-none" aria-label={t(`mood.${mood}`)}>
                    {mood === "today" ? "•◡•" : mood === "unresolved" ? "•︵•" : "•ᴗ•"}
                  </span>
                ) : null}
              </header>
              <div className="relative border-s-2 border-line ps-3">
                {isToday ? (
                  <span
                    className="absolute start-0 end-0 z-10 border-t-2 border-now"
                    style={{ top: `${Math.min(Math.max(nowMinutes - 8 * 60, 0) / 8, 92)}%` }}
                    aria-hidden
                  />
                ) : null}
                {items.length === 0 ? (
                  <p className="type-caption py-6">{t("emptyDay")}</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((occurrence) => {
                      const tone = occurrenceTone(occurrence);
                      const minutes = Math.max(
                        minutesBetweenDates(occurrence.start, occurrence.end),
                        20,
                      );
                      const state = occurrence.task
                        ? calendarTaskState(occurrence.task, occurrence.end, now)
                        : "scheduled";
                      const block = (
                        <>
                          <p className="type-time text-[0.7rem]" suppressHydrationWarning>
                            {formatClock(occurrence.start, locale)}
                          </p>
                          <p className="type-title text-[0.9rem] text-ink">
                            {state === "completed" ? "✓ " : state === "unresolved" ? "○ " : ""}
                            {occurrence.event?.title ?? occurrence.task?.title}
                          </p>
                          {state === "unresolved" ? <p className="type-caption">{t("stillOpen")}</p> : null}
                          {state === "cancelled" ? <p className="type-caption">{t("cancelled")}</p> : null}
                        </>
                      );
                      return (
                        <li
                          key={occurrence.id}
                          className={`overflow-hidden rounded-xl px-2 py-1.5 ${TONE_OBJECT[tone]} ${
                            occurrence.kind === "event"
                              ? ""
                              : "outline outline-dashed outline-1 outline-current/20"
                          } ${state === "unresolved" ? "object-open" : ""} ${
                            state === "cancelled" || state === "completed" ? "band-past" : ""
                          }`}
                          style={{ minHeight: Math.min(20 + minutes * 0.55, 120) }}
                        >
                          {occurrence.event && isExternallyManagedEvent(occurrence.event) ? (
                            <ReadOnlyEvent event={occurrence.event}>{block}</ReadOnlyEvent>
                          ) : (
                            block
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
