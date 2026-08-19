"use client";

import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/page-title";
import { useDayline, useTodayModel } from "@/components/app-provider";
import { TaskCard } from "@/components/task-card";

export function SometimeView() {
  const t = useTranslations("app.sometime");
  const { start, pause, complete, inbox, tomorrow } = useDayline();
  const { sometime, elapsed } = useTodayModel();
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      {sometime.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      {sometime.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          elapsed={elapsed(task.id)}
          onStart={() => start(task.id)}
          onPause={() => pause(task.id)}
          onComplete={() => complete(task.id)}
          onInbox={() => inbox(task.id)}
          onTomorrow={() => tomorrow(task.id)}
        />
      ))}
    </div>
  );
}
