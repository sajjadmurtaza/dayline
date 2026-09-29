"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { searchBookmarks } from "@/domains/bookmarks/bookmarks";
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
  const tasks = results.filter(isTask);
  const notes = results.filter(isNote);
  const events = results.filter(isEvent);
  const projects = q.trim()
    ? doc.projects.filter((project) => project.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const bookmarks = searchBookmarks(q, doc.bookmarks, doc.bookmarkFolders, doc.bookmarkPlacements);
  const empty = q && tasks.length + notes.length + events.length + projects.length + bookmarks.length === 0;
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("placeholder")}
        className="min-h-12 w-full rounded-full px-4 ring-1 ring-line"
      />
      {empty ? <p className="text-muted">{t("empty")}</p> : null}
      <SearchGroup label={t("tasks")} items={tasks.map((item) => item.id)}>
        {tasks.map((item) => (
          <li key={item.id}>
            <TaskCard
              task={item}
              onStart={() => start(item.id)}
              onPause={() => pause(item.id)}
              onComplete={() => complete(item.id)}
            />
          </li>
        ))}
      </SearchGroup>
      <SearchGroup label={t("notes")} items={notes.map((item) => item.id)}>
        {notes.map((item) => (
          <li key={item.id}>
            <StickyNote
              note={item}
              onConvert={() => noteToTask(item.id)}
              onPin={() => pin(item.id, !item.pinnedToday)}
            />
          </li>
        ))}
      </SearchGroup>
      <SearchGroup label={t("bookmarks")} items={bookmarks.map((hit) => hit.bookmark.id)}>
        {bookmarks.map((hit) => (
          <li key={hit.bookmark.id} className="text-sm">
            <p className="font-medium">{hit.bookmark.title}</p>
            <p className="text-muted">{hit.bookmark.domain}</p>
          </li>
        ))}
      </SearchGroup>
      <SearchGroup label={t("projects")} items={projects.map((project) => project.id)}>
        {projects.map((project) => (
          <li key={project.id} className="font-medium">{project.name}</li>
        ))}
      </SearchGroup>
      <ul className="space-y-3">
        {events.map((item) => (
          <li key={item.id}>
            {isEvent(item) ? (
              <div>
                <p className="type-caption">
                  {t("calendarEvent")}
                  {item.calendarName ? ` · ${item.calendarName}` : ""}
                </p>
                <EventCard event={item} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchGroup({ label, items, children }: { label: string; items: string[]; children: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-muted">{label}</h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}
