"use client";

import { useLocale, useTranslations } from "next-intl";
import { Companion } from "@/components/companion";
import { StickyNote } from "@/components/sticky-note";
import { TaskChip } from "@/components/task-chip";
import { formatClock } from "@/lib/dates";
import type { Note, Task } from "@/lib/types";
import type { DaySnapshot } from "@/domains/planning/day-view";
import type { PlacementCue } from "@/domains/planning/time-kinds";

export function TodayRail({
  snapshot,
  unscheduled,
  pinned,
  running,
  projectName,
  placeCue = null,
  hideStart = false,
  onPlace,
  onStart,
  onConvert,
  onPin,
  onInbox,
  onFindTime,
  onDismiss,
}: {
  snapshot: DaySnapshot;
  unscheduled: Task[];
  pinned: Note[];
  running: Task | null;
  projectName: string | null;
  placeCue?: PlacementCue | null;
  hideStart?: boolean;
  onPlace?: (cue: PlacementCue) => void;
  onStart: (id: string) => void;
  onConvert: (id: string) => void;
  onPin: (id: string) => void;
  onInbox?: (id: string) => void;
  onFindTime?: () => void;
  onDismiss?: () => void;
}) {
  const t = useTranslations("app.today");
  const companion = useTranslations("app.companion");
  const locale = useLocale();
  const next = snapshot.nextOccurrence;
  const nextTime = next ? formatClock(next.start, locale) : null;
  let companionNode: {
    state: "idle" | "thinking" | "focused" | "curious";
    message: string;
  } | null = null;
  if (running && next?.kind === "event") {
    companionNode = {
      state: "focused",
      message: nextTime
        ? companion("stayWithThis", { time: nextTime })
        : companion("stayWithThisOpen"),
    };
  } else if (snapshot.notice?.kind === "unresolved") {
    companionNode = { state: "curious", message: companion("stillWantThis") };
  } else if (snapshot.showEveningClose) {
    companionNode = null;
  } else if (placeCue) {
    companionNode = {
      state: "thinking",
      message: t("placementFits", { title: placeCue.task.title, minutes: placeCue.minutes }),
    };
  }

  const place = hideStart ? [] : unscheduled;
  const hasBody =
    companionNode || place.length > 0 || pinned.length > 0 || Boolean(projectName && running);
  if (!hasBody) return null;

  return (
    <aside data-readme="today-rail" className="sticky top-10 hidden w-full max-w-[20rem] lg:block">
      <div className="space-y-5 overflow-visible rounded-[1.6rem] bg-paper-raised p-5 shadow-[var(--shadow)]">
        {companionNode ? (
          <div className="space-y-2">
            <Companion
              state={companionNode.state}
              message={companionNode.message}
              label={companion("label")}
              name={companion("name")}
            />
            {placeCue && onPlace ? (
              <div className="ps-12">
                <button type="button" className="pill pill-now" onClick={() => onPlace(placeCue)}>
                  {t("placeIt")}
                </button>
              </div>
            ) : null}
            {snapshot.notice?.kind === "unresolved" && snapshot.notice.itemId ? (
              <div className="flex flex-wrap gap-1 ps-12">
                {onFindTime ? (
                  <button type="button" className="pill pill-muted" onClick={onFindTime}>
                    {t("findAnotherTime")}
                  </button>
                ) : null}
                {onInbox ? (
                  <button
                    type="button"
                    className="pill pill-muted"
                    onClick={() => onInbox(snapshot.notice!.itemId!)}
                  >
                    {t("inbox")}
                  </button>
                ) : null}
                {onDismiss ? (
                  <button type="button" className="pill pill-muted" onClick={onDismiss}>
                    {t("dismissCue")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {projectName && running ? (
          <section>
            <p className="type-caption mb-1">{t("projectContext")}</p>
            <p className="type-title">{projectName}</p>
          </section>
        ) : null}
        {place.length > 0 ? (
          <section>
            <p className="mb-3 flex items-baseline justify-between">
              <span className="type-heading">{t("unscheduled")}</span>
              <span className="type-caption">{place.length}</span>
            </p>
            <ul className="space-y-1">
              {place.map((task) => (
                <li key={task.id}>
                  <TaskChip task={task} onStart={hideStart ? undefined : () => onStart(task.id)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {pinned.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            onConvert={() => onConvert(note.id)}
            onPin={() => onPin(note.id)}
          />
        ))}
      </div>
    </aside>
  );
}
