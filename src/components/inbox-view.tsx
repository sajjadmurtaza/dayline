"use client";

import { useTranslations } from "next-intl";
import { useDayline, useTodayModel } from "@/components/app-provider";
import { PageTitle } from "@/components/page-title";
import { QuickCapture } from "@/components/quick-capture";
import { Scene } from "@/components/scene";
import { TaskCard } from "@/components/task-card";

export function InboxView() {
  const t = useTranslations("app.inbox");
  const { start, pause, complete, tomorrow } = useDayline();
  const { unscheduled, elapsed } = useTodayModel();
  return (
    <div className="space-y-3">
      <div>
        <PageTitle>{t("title")}</PageTitle>
        <p className="mt-0.5 type-caption">{t("dropHint")}</p>
      </div>
      <QuickCapture showHint={false} />
      {unscheduled.length === 0 ? (
        <Scene name="emptyInbox" label={t("empty")} />
      ) : (
        <ul className="space-y-2">
          {unscheduled.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                elapsed={elapsed(task.id)}
                onStart={() => start(task.id)}
                onPause={() => pause(task.id)}
                onComplete={() => complete(task.id)}
                onTomorrow={() => tomorrow(task.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
