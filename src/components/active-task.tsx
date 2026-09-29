"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { TaskReferences } from "@/components/bookmarks-view";
import { DaylineIcon } from "@/components/icons";
import { SessionMeter } from "@/components/session-meter";
import type { Task } from "@/lib/types";

export function ActiveTask({
  task,
  elapsed,
  startedLabel,
  onPause,
  onComplete,
  compact = false,
}: {
  task: Task;
  elapsed: number;
  startedLabel?: string;
  onPause: () => void;
  onComplete: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("app.today");
  const common = useTranslations("common");
  const reduce = useReducedMotion();
  return (
    <motion.section
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="session-live flex flex-col gap-2 rounded-2xl bg-paper-raised px-4 py-3 ring-1 ring-now/25"
      aria-label={common("a11y.runningTask")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 type-time text-now">
            <span className="live-dot" aria-hidden />
            {t("current")}
          </p>
          <p className="type-title truncate font-semibold">{task.title}</p>
          {startedLabel && !compact ? <p className="type-caption mt-1">{startedLabel}</p> : null}
          <p className="type-timer mt-1 text-sm">
            {common("duration.minutes", { count: elapsed })} {common("duration.elapsed")}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" className="pill pill-muted" onClick={onPause}>
            <DaylineIcon name="pause" className="me-1 h-3.5 w-3.5" />
            {common("actions.pause")}
          </button>
          <button type="button" className="pill pill-muted text-ok" onClick={onComplete}>
            <DaylineIcon name="done" className="me-1 h-3.5 w-3.5" />
            {common("actions.done")}
          </button>
        </div>
      </div>
      <SessionMeter elapsed={elapsed} estimate={task.estimatedMinutes} live />
      <TaskReferences taskId={task.id} />
    </motion.section>
  );
}
