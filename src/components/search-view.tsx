"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { searchDoc, useDayline } from "@/components/app-provider";
import { PageTitle } from "@/components/page-title";
import { EventCard } from "@/components/event-card";
import { StickyNote } from "@/components/sticky-note";
import { TaskCard } from "@/components/task-card";
import { isEvent, isNote, isTask } from "@/lib/types";

export function SearchView() {
  const t = useTranslations("app.search");
  const { doc, start, pause, complete, noteToTask, pin } = useDayline();
  const [q, setQ] = useState("");
  const results = searchDoc(doc, q);
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("placeholder")}
        className="min-h-12 w-full rounded-full px-4 ring-1 ring-line"
      />
      {q && results.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      <ul className="space-y-3">
        {results.map((item) => (
          <li key={item.id}>
            {isTask(item) ? (
              <TaskCard
                task={item}
                onStart={() => start(item.id)}
                onPause={() => pause(item.id)}
                onComplete={() => complete(item.id)}
              />
            ) : null}
            {isEvent(item) ? <EventCard event={item} /> : null}
            {isNote(item) ? (
              <StickyNote
                note={item}
                onConvert={() => noteToTask(item.id)}
                onPin={() => pin(item.id, !item.pinnedToday)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
