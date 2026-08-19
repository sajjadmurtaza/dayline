"use client";

import { useTranslations } from "next-intl";
import { DaylineIcon } from "@/components/icons";
import { DurationPicker } from "@/components/duration-picker";
import { ProgressBar } from "@/components/progress-bar";
import { taskTone, toneIcon, TONE_CLASS } from "@/components/timeline/tone";
import type { Task } from "@/lib/types";

export function TaskCard({
  task,
  elapsed = 0,
  onStart,
  onPause,
  onComplete,
  onInbox,
  onTomorrow,
  onEstimate,
}: {
  task: Task;
  elapsed?: number;
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onInbox?: () => void;
  onTomorrow?: () => void;
  onEstimate?: (minutes: number) => void;
}) {
  const t = useTranslations("common");
  const running = task.status === "running";
  const tone = taskTone(task);
  const showMeter = running || task.status === "paused" || elapsed > 0;
  return (
    <article className={`rounded-[1.05rem] px-3 py-2.5 ring-1 ring-line ${TONE_CLASS[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="type-title flex min-w-0 items-center gap-1.5 text-ink">
          <DaylineIcon name={toneIcon(tone)} className="h-4 w-4 shrink-0" />
          <span className="truncate">{task.title}</span>
        </p>
        {task.estimatedMinutes && !showMeter ? (
          <p className="type-caption shrink-0">
            ~{t("duration.minutes", { count: task.estimatedMinutes })}
          </p>
        ) : null}
      </div>
      {showMeter ? (
        <div className="mt-1">
          <ProgressBar elapsed={elapsed} estimate={task.estimatedMinutes} live={running} />
        </div>
      ) : null}
      {onEstimate ? (
        <div className="mt-1.5">
          <DurationPicker value={task.estimatedMinutes} onChange={onEstimate} />
        </div>
      ) : null}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {task.status !== "completed" && task.status !== "running" && onStart ? (
          <button type="button" className="pill pill-soft" onClick={onStart}>
            {t("actions.start")}
          </button>
        ) : null}
        {running ? (
          <>
            <button type="button" className="pill pill-muted" onClick={onPause}>
              {t("actions.pause")}
            </button>
            <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
              {t("actions.done")}
            </button>
          </>
        ) : null}
        {task.status === "paused" && onComplete ? (
          <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
            {t("actions.done")}
          </button>
        ) : null}
        {onTomorrow ? (
          <button type="button" className="pill pill-muted" onClick={onTomorrow}>
            {t("actions.moveTomorrow")}
          </button>
        ) : null}
        {onInbox ? (
          <button type="button" className="pill pill-muted" onClick={onInbox}>
            {t("actions.backToInbox")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
