"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { DaylineIcon } from "@/components/icons";
import { SessionMeter } from "@/components/session-meter";
import { itemHeight } from "@/components/timeline/spine";
import { occurrenceTone, toneIcon, TONE_OBJECT } from "@/components/timeline/tone";
import type {
  AttentionPhase,
  DayNotice,
  TimeBand,
  TimedOccurrence,
} from "@/domains/planning/day-view";
import { formatClock, minutesBetweenDates } from "@/lib/dates";

export function TimelineItem({
  occurrence,
  band,
  elapsed = 0,
  attention = "none",
  notice = null,
  onStart,
  onPause,
  onComplete,
  onKeep,
  onAdjust,
  onDismissNotice,
  onWrapUp,
  onInbox,
}: {
  occurrence: TimedOccurrence;
  band: TimeBand | "current";
  elapsed?: number;
  attention?: AttentionPhase;
  notice?: DayNotice | null;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onKeep?: () => void;
  onAdjust?: () => void;
  onDismissNotice?: () => void;
  onWrapUp?: () => void;
  onInbox?: () => void;
}) {
  const actions = useTranslations("common.actions");
  const notices = useTranslations("app.notices");
  const today = useTranslations("app.today");
  const bands = useTranslations("common.bands");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const task = occurrence.task;
  const live = band === "current";
  const running = task?.status === "running";
  const completed = task?.status === "completed";
  const cancelled = task?.status === "cancelled";
  const tone = occurrenceTone(occurrence);
  const minutes = minutesBetweenDates(occurrence.start, occurrence.end);
  const height = itemHeight(Math.max(minutes, live ? 50 : 20), live ? "current" : band);
  const over = Boolean(running && task?.estimatedMinutes && elapsed > task.estimatedMinutes);
  const attached = notice && notice.itemId === occurrence.id ? notice : null;
  const stillOpen = attention === "stillOpen";
  const ready = attention === "ready";
  const waiting = attention === "waiting";
  const fade = band === "past" && !stillOpen && !waiting && !ready;

  return (
    <motion.article
      layout={!reduce}
      className={`relative grid grid-cols-[3.6rem_minmax(0,1fr)] items-start gap-x-3 ${
        fade ? "band-past" : band === "later" ? "band-later" : ""
      }`}
      style={{ minHeight: height }}
      transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="type-time pt-3 text-end text-muted" suppressHydrationWarning>
        {formatClock(occurrence.start, locale)}
      </p>
      <div
        className={`relative overflow-hidden rounded-[1.05rem] px-4 py-3 ${TONE_OBJECT[tone]} ${
          running ? "session-live" : live ? "shadow-[var(--shadow-now)]" : ""
        } ${band === "next" ? "ring-1 ring-now/30" : ""} ${stillOpen ? "object-open" : ""} ${ready ? "nudge-once" : ""}`}
      >
        <p
          className={`flex items-center gap-2 text-ink ${live ? "type-live" : "type-title"} ${
            completed || cancelled ? "font-normal" : ""
          }`}
        >
          {running ? <span className="live-dot" aria-hidden /> : null}
          {reduce && ready ? <span className="attention-dot" aria-hidden /> : null}
          <DaylineIcon
            name={completed ? "done" : toneIcon(tone, occurrence.kind)}
            className="h-4 w-4 shrink-0"
          />
          {occurrence.event?.title ?? task?.title}
          <span className="sr-only"> {bands(band === "current" ? "now" : band)}</span>
        </p>
        {ready ? <p className="type-caption mt-1">{today("ready")}</p> : null}
        {waiting ? <p className="type-caption mt-1">{today("readyWhenYouAre")}</p> : null}
        {stillOpen ? (
          <p className="type-caption mt-1">
            {today("stillOpen")}
            {" · "}
            {today("plannedFor", { time: formatClock(occurrence.start, locale) })}
          </p>
        ) : null}
        {cancelled ? <p className="type-caption mt-1">{today("cancelled")}</p> : null}
        {running && task ? (
          <SessionMeter elapsed={elapsed} estimate={task.estimatedMinutes} />
        ) : null}
        {attached && attached.kind !== "unresolved" ? (
          <div className="mt-3 space-y-2">
            <p className="type-title text-now">
              {notices(attached.messageKey, {
                title: attached.title,
                minutes: attached.minutes ?? 0,
              })}
            </p>
            <div className="flex flex-wrap gap-1">
              {attached.kind === "overrun" ? (
                <>
                  {onKeep ? (
                    <button type="button" className="pill pill-now" onClick={onKeep}>
                      {notices("keepGoing")}
                    </button>
                  ) : null}
                  {onAdjust ? (
                    <button type="button" className="pill pill-muted" onClick={onAdjust}>
                      {notices("adjustDay")}
                    </button>
                  ) : null}
                </>
              ) : null}
              {attached.kind === "upcoming" ? (
                <>
                  {onWrapUp ? (
                    <button type="button" className="pill pill-now" onClick={onWrapUp}>
                      {notices("wrapUp")}
                    </button>
                  ) : null}
                  {onKeep ? (
                    <button type="button" className="pill pill-muted" onClick={onKeep}>
                      {notices("keepGoing")}
                    </button>
                  ) : null}
                </>
              ) : null}
              {attached.kind === "conflict" && onAdjust ? (
                <button type="button" className="pill pill-now" onClick={onAdjust}>
                  {notices("showOptions")}
                </button>
              ) : null}
              {onDismissNotice ? (
                <button type="button" className="pill pill-muted" onClick={onDismissNotice}>
                  {notices("dismiss")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {stillOpen && task ? (
          <div className="mt-3 space-y-2">
            <p className="type-caption">{today("whatHappened")}</p>
            <div className="flex flex-wrap gap-1">
              {onComplete ? (
                <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
                  {actions("done")}
                </button>
              ) : null}
              {onStart ? (
                <button type="button" className="pill pill-now" onClick={onStart}>
                  {today("startNow")}
                </button>
              ) : null}
              {onAdjust ? (
                <button type="button" className="pill pill-muted" onClick={onAdjust}>
                  {today("findAnotherTime")}
                </button>
              ) : null}
              {onInbox ? (
                <button type="button" className="pill pill-muted" onClick={onInbox}>
                  {actions("backToInbox")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {task && !completed && !cancelled && !stillOpen && attached?.kind !== "unresolved" ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {task.status !== "running" ? (
              onStart ? (
                <button type="button" className="pill pill-soft" onClick={onStart}>
                  {actions("start")}
                </button>
              ) : null
            ) : over && onKeep ? (
              <>
                <button type="button" className="pill pill-now" onClick={onKeep}>
                  {notices("keepGoing")}
                </button>
                {onAdjust ? (
                  <button type="button" className="pill pill-muted" onClick={onAdjust}>
                    {notices("adjustDay")}
                  </button>
                ) : null}
                <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
                  {actions("done")}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="pill pill-muted" onClick={onPause}>
                  {actions("pause")}
                </button>
                <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
                  {actions("done")}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
