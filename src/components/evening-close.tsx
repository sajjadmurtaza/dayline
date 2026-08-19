"use client";

import { useTranslations } from "next-intl";
import { Companion } from "@/components/companion";
import { Scene } from "@/components/scene";
import type { Task } from "@/lib/types";

export function EveningClose({
  phase,
  unfinished,
  onTomorrow,
  onInbox,
  onMoveAll,
  onFinish,
}: {
  phase: "closing" | "settled";
  unfinished: Task[];
  onTomorrow: (id: string) => void;
  onInbox: (id: string) => void;
  onMoveAll: () => void;
  onFinish: () => void;
}) {
  const t = useTranslations("app.review");
  const companion = useTranslations("app.companion");
  const duration = useTranslations("common.duration");

  if (phase === "settled") {
    return (
      <section className="max-w-[40rem] pt-4" aria-labelledby="evening-close">
        <Scene name="evening" label={t("thatsToday")} showCaption={false} />
        <h2 id="evening-close" className="type-heading mt-3">
          {t("thatsToday")}
        </h2>
        <p className="type-caption mt-1">{t("tomorrowReady")}</p>
        <button type="button" className="pill pill-now mt-5" onClick={onFinish}>
          {t("finishToday")}
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-[40rem] pt-2" aria-labelledby="evening-close">
      <Scene name="evening" label={t("title")} showCaption={false} />
      <h2 id="evening-close" className="type-heading mt-3">
        {t("title")}
      </h2>
      <p className="mt-2 type-title font-normal text-muted">
        {t("stillNeedHome", { count: unfinished.length })}
      </p>
      <div className="mt-4">
        <Companion
          state="resting"
          message={companion("eveningUnfinished", { count: unfinished.length })}
          label={companion("label")}
          name={companion("name")}
        />
      </div>
      <ul className="mt-5 divide-y divide-line">
        {unfinished.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="type-title font-medium text-ink">{task.title}</p>
              {task.estimatedMinutes ? (
                <p className="type-caption">
                  ~{duration("minutes", { count: task.estimatedMinutes })}
                </p>
              ) : null}
            </div>
            <div className="flex gap-1">
              <button type="button" className="pill pill-soft" onClick={() => onTomorrow(task.id)}>
                {t("toTomorrow")}
              </button>
              <button type="button" className="pill pill-muted" onClick={() => onInbox(task.id)}>
                {t("toInbox")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="pill pill-now" onClick={onMoveAll}>
          {t("moveAllTomorrow")}
        </button>
        <button type="button" className="pill pill-muted" onClick={onFinish}>
          {t("finishToday")}
        </button>
      </div>
    </section>
  );
}
