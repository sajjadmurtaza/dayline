"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDayline, useTodayModel } from "@/components/app-provider";
import { EveningClose } from "@/components/evening-close";
import { DaylineIcon } from "@/components/icons";
import { QuickCapture } from "@/components/quick-capture";
import { StickyNote } from "@/components/sticky-note";
import { TaskChip } from "@/components/task-chip";
import { Timeline } from "@/components/timeline";
import { TodayRail } from "@/components/today-rail";
import { TodaySummary } from "@/components/today-summary";

export function TodayView() {
  const t = useTranslations("app.today");
  const common = useTranslations("common");
  const locale = useLocale();
  const {
    now,
    start,
    complete,
    planDay,
    undo,
    noteToTask,
    pin,
    tomorrow,
    inbox,
    tomorrowAll,
    dismissNotice,
    schedule,
    doc,
  } = useDayline();
  const model = useTodayModel();
  const [planning, setPlanning] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [dismissedUndoAt, setDismissedUndoAt] = useState<string | null>(null);
  const dateLabel = now.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const notice = model.snapshot.notice;
  const undoEntry = doc.undo[0];
  const toast = undoEntry && undoEntry.at !== dismissedUndoAt ? undoEntry.label : null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const projectName = model.running?.projectId
    ? (doc.projects.find((project) => project.id === model.running?.projectId)?.name ?? null)
    : null;
  const evening = model.snapshot.showEveningClose;
  const settled = model.snapshot.showEveningSettled && !dayClosed;

  useEffect(() => {
    document.getElementById("dayline-now")?.scrollIntoView({ block: "center", inline: "nearest" });
  }, []);

  useEffect(() => {
    if (!undoEntry) return;
    const id = window.setTimeout(() => setDismissedUndoAt(undoEntry.at), 5200);
    return () => window.clearTimeout(id);
  }, [undoEntry]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id).startsWith("task:") ? String(active.id).slice(5) : "";
    if (!taskId) return;
    const startIso = over.data.current?.startIso;
    if (typeof startIso === "string") schedule(taskId, new Date(startIso));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div
        className={`lg:grid lg:items-start lg:gap-10 ${
          model.unscheduled.length > 0 || model.pinned.length > 0 || projectName
            ? "lg:grid-cols-[minmax(0,46rem)_20rem]"
            : "lg:grid-cols-[minmax(0,46rem)]"
        }`}
      >
        <div className={`space-y-7 ${settled ? "day-settled" : ""}`}>
          <header
            data-readme="today-header"
            className="flex flex-wrap items-end justify-between gap-3"
          >
            <div>
              <p className="type-caption">{t(`greeting.${model.snapshot.greeting}`)}</p>
              <h1 className="type-display" suppressHydrationWarning>
                {dateLabel}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="pill pill-soft inline-flex gap-1.5"
                onClick={() => setPlanning(true)}
              >
                <DaylineIcon name="plan" className="h-4 w-4" />
                {common("actions.planMyDay")}
              </button>
            </div>
          </header>

          <div data-readme="today-summary">
            <TodaySummary snapshot={model.snapshot} />
          </div>

          <QuickCapture />

          {planning ? (
            <div className="flex flex-wrap items-center gap-2" role="status">
              <p className="type-caption me-auto">{t("planPreview")}</p>
              <button
                type="button"
                className="pill pill-now"
                onClick={() => {
                  planDay();
                  setPlanning(false);
                }}
              >
                {common("actions.acceptPlan")}
              </button>
              <button type="button" className="pill pill-muted" onClick={() => setPlanning(true)}>
                {common("actions.change")}
              </button>
              <button type="button" className="pill pill-muted" onClick={() => setPlanning(false)}>
                {common("actions.cancel")}
              </button>
            </div>
          ) : null}

          <Timeline
            planning={planning}
            onKeep={notice ? () => dismissNotice(notice.id) : undefined}
            onAdjust={() => setPlanning(true)}
            onDismissNotice={notice ? () => dismissNotice(notice.id) : undefined}
            onWrapUp={model.running ? () => complete(model.running!.id) : undefined}
          />

          {evening ? (
            <EveningClose
              phase="closing"
              unfinished={model.snapshot.unfinished}
              onTomorrow={tomorrow}
              onInbox={inbox}
              onMoveAll={() => tomorrowAll(model.snapshot.unfinished.map((task) => task.id))}
              onFinish={() => setDayClosed(true)}
            />
          ) : null}

          {settled ? (
            <EveningClose
              phase="settled"
              unfinished={[]}
              onTomorrow={tomorrow}
              onInbox={inbox}
              onMoveAll={() => undefined}
              onFinish={() => setDayClosed(true)}
            />
          ) : null}

          {!evening ? (
            <section className="lg:hidden">
              <h2 className="type-heading mb-3">
                {t("unscheduled")}
                {model.unscheduled.length > 0 ? (
                  <span className="ms-2 type-caption">{model.unscheduled.length}</span>
                ) : null}
              </h2>
              {model.unscheduled.length === 0 ? (
                <p className="type-caption">{t("emptyUnscheduled")}</p>
              ) : (
                <ul className="space-y-1">
                  {model.unscheduled.map((task) => (
                    <li key={task.id}>
                      <TaskChip task={task} onStart={() => start(task.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {model.pinned.length > 0 ? (
            <section className="lg:hidden">
              <h2 className="type-heading mb-3">{t("pinnedNotes")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {model.pinned.map((note) => (
                  <StickyNote
                    key={note.id}
                    note={note}
                    onConvert={() => noteToTask(note.id)}
                    onPin={() => pin(note.id, false)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <TodayRail
          snapshot={model.snapshot}
          unscheduled={model.unscheduled}
          pinned={model.pinned}
          running={model.running}
          projectName={projectName}
          advice={model.advice}
          hideStart={evening}
          onStart={start}
          onConvert={noteToTask}
          onPin={(id) => pin(id, false)}
          onInbox={inbox}
          onFindTime={() => setPlanning(true)}
          onDismiss={notice ? () => dismissNotice(notice.id) : undefined}
        />
      </div>

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center lg:bottom-8">
          <p className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-paper-raised">
            {undoToastLabel(common, toast)}
            <button type="button" className="font-medium text-companion" onClick={undo}>
              {common("actions.undo")}
            </button>
          </p>
        </div>
      ) : null}
    </DndContext>
  );
}

function undoToastLabel(common: ReturnType<typeof useTranslations<"common">>, label: string) {
  switch (label) {
    case "capture":
      return common("undoToast.capture");
    case "start":
      return common("undoToast.start");
    case "pause":
      return common("undoToast.pause");
    case "complete":
      return common("undoToast.complete");
    case "schedule":
      return common("undoToast.schedule");
    case "plan":
      return common("undoToast.plan");
    case "inbox":
      return common("undoToast.inbox");
    case "delete":
      return common("undoToast.delete");
    case "convert":
      return common("undoToast.convert");
    default:
      return common("actions.undo");
  }
}
