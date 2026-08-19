"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { DaylineIcon } from "@/components/icons";
import { taskTone, toneIcon, TONE_OBJECT } from "@/components/timeline/tone";
import type { Task } from "@/lib/types";

export function TaskChip({ task, onStart }: { task: Task; onStart?: () => void }) {
  const t = useTranslations("common");
  const tone = taskTone(task);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { taskId: task.id },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center justify-between gap-3 rounded-[1.05rem] px-3 py-2.5 ${TONE_OBJECT[tone]} ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-start"
        {...listeners}
        {...attributes}
      >
        <DaylineIcon name={toneIcon(tone)} className="h-4 w-4 shrink-0" />
        <span className="type-title truncate text-ink">{task.title}</span>
      </button>
      {task.estimatedMinutes ? (
        <span className="type-caption shrink-0">
          ~{t("duration.minutes", { count: task.estimatedMinutes })}
        </span>
      ) : null}
      {onStart ? (
        <button type="button" className="pill pill-muted shrink-0" onClick={onStart}>
          {t("actions.start")}
        </button>
      ) : null}
    </div>
  );
}
