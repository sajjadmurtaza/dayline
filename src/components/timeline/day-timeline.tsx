"use client";

import { useLocale, useTranslations } from "next-intl";
import { useDayline, useTodayModel } from "@/components/app-provider";
import { Scene } from "@/components/scene";
import { NowMarker } from "@/components/timeline/now-marker";
import { buildSpine } from "@/components/timeline/spine";
import { TimelineGap } from "@/components/timeline/timeline-gap";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { occurrencesOnDay } from "@/domains/planning/day-view";
import { addDays, startOfDay } from "@/lib/clock";
import { formatClock } from "@/lib/dates";
import { detectConflicts, eventsOnDay } from "@/domains/planning/engine";
import { isEvent, isTask } from "@/lib/types";

export function DayTimeline({
  planning = false,
  onKeep,
  onAdjust,
  onDismissNotice,
  onWrapUp,
}: {
  planning?: boolean;
  onKeep?: () => void;
  onAdjust?: () => void;
  onDismissNotice?: () => void;
  onWrapUp?: () => void;
}) {
  const today = useTranslations("app.today");
  const locale = useLocale();
  const { now, start, complete, pause, inbox, doc } = useDayline();
  const { elapsed, snapshot, proposal } = useTodayModel();
  const items = occurrencesOnDay(doc, now);
  const nodes = buildSpine({
    items,
    now,
    bands: snapshot.bands,
    current: snapshot.nowOccurrence,
    greeting: snapshot.greeting,
  });
  const notice = snapshot.notice;
  const dayStart = startOfDay(now).getTime();
  const dayEnd = addDays(startOfDay(now), 1).getTime();
  const quiet = doc.items.filter(isEvent).filter((event) => {
    if (event.calendarPlacement !== "quiet") return false;
    const start = new Date(event.start).getTime();
    return start >= dayStart && start < dayEnd;
  });
  const overlap = detectConflicts(eventsOnDay(doc, now));

  return (
    <div className="spine">
      {quiet.map((event) => (
        <p key={event.id} className="type-caption ms-[3.6rem]">
          {event.title}
        </p>
      ))}
      {overlap.length ? <p className="type-caption ms-[3.6rem]">{today("overlap")}</p> : null}
      <div className="spine-line" aria-hidden />
      <div className="relative space-y-1">
        {nodes.map((node) => {
          if (node.type === "atmosphere") {
            return (
              <div key={node.period} className="ms-[3.6rem] py-1">
                <Scene
                  name={node.period}
                  label={today(`greeting.${node.period === "morning" ? "morning" : "evening"}`)}
                />
              </div>
            );
          }
          if (node.type === "gap") {
            return (
              <TimelineGap key={node.id} id={node.id} minutes={node.minutes} start={node.start} />
            );
          }
          if (node.type === "now") {
            return <NowMarker key="now" now={node.at} />;
          }
          const occurrence = node.occurrence;
          const live = node.type === "current";
          return (
            <TimelineItem
              key={occurrence.id}
              occurrence={occurrence}
              band={live ? "current" : node.band}
              elapsed={occurrence.task ? elapsed(occurrence.id) : 0}
              attention={snapshot.attention[occurrence.id] ?? "none"}
              notice={notice}
              onStart={occurrence.task ? () => start(occurrence.id) : undefined}
              onPause={occurrence.task ? () => pause(occurrence.id) : undefined}
              onComplete={occurrence.task ? () => complete(occurrence.id) : undefined}
              onInbox={occurrence.task ? () => inbox(occurrence.id) : undefined}
              onKeep={live || notice?.itemId === occurrence.id ? onKeep : undefined}
              onAdjust={occurrence.task ? onAdjust : undefined}
              onDismissNotice={notice?.itemId === occurrence.id ? onDismissNotice : undefined}
              onWrapUp={notice?.itemId === occurrence.id ? onWrapUp : undefined}
            />
          );
        })}
        {planning
          ? proposal.moves.map((move) => {
              const task = doc.items.find((item) => item.id === move.taskId);
              if (!task || !isTask(task)) return null;
              const startAt = new Date(move.scheduledStart);
              const endAt = new Date(move.scheduledEnd);
              return (
                <article
                  key={`proposed:${move.taskId}`}
                  className="relative grid grid-cols-[3.6rem_minmax(0,1fr)] items-start gap-x-3"
                >
                  <p className="type-time pt-3 text-end text-muted" suppressHydrationWarning>
                    {formatClock(startAt, locale)}
                  </p>
                  <div className="object-proposed time-proposed rounded-[1.05rem] px-4 py-3">
                    <p className="type-caption text-task">{today("proposed")}</p>
                    <p className="type-title text-ink">{task.title}</p>
                    <p className="type-caption" suppressHydrationWarning>
                      {formatClock(startAt, locale)}–{formatClock(endAt, locale)}
                    </p>
                  </div>
                </article>
              );
            })
          : null}
      </div>
      <p className="sr-only">{today("title")}</p>
    </div>
  );
}
