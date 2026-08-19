"use client";

import { useTranslations } from "next-intl";
import { useDayline } from "@/components/app-provider";
import { PageTitle } from "@/components/page-title";
import { EventCard } from "@/components/event-card";
import { TaskCard } from "@/components/task-card";
import { addDays, startOfDay } from "@/lib/clock";
import { isEvent, isTask } from "@/lib/types";

export function UpcomingView() {
  const t = useTranslations("app.upcoming");
  const { doc, start, pause, complete, inbox, tomorrow } = useDayline();
  const from = addDays(startOfDay(new Date()), 1).getTime();
  const tasks = doc.items
    .filter(isTask)
    .filter((task) => task.scheduledStart && new Date(task.scheduledStart).getTime() >= from);
  const events = doc.items
    .filter(isEvent)
    .filter((event) => new Date(event.start).getTime() >= from);
  const empty = tasks.length + events.length === 0;
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      {empty ? <p className="text-muted">{t("empty")}</p> : null}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
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
