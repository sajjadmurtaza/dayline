"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkPicker } from "@/components/bookmarks-view";
import { PageTitle } from "@/components/page-title";
import { useDayline } from "@/components/app-provider";
import { ShareButton } from "@/components/share/ShareButton";
import { StickyNote } from "@/components/sticky-note";
import { TaskCard } from "@/components/task-card";
import { isNote, isTask } from "@/lib/types";

export function ProjectsView() {
  const t = useTranslations("app.projects");
  const { doc, newProject, start, pause, complete, noteToTask, pin } = useDayline();
  const [name, setName] = useState("");
  return (
    <div className="space-y-6">
      <PageTitle>{t("title")}</PageTitle>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          newProject(name.trim());
          setName("");
        }}
      >
        <label className="sr-only" htmlFor="project-name">
          {t("name")}
        </label>
        <input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("new")}
          className="min-h-12 flex-1 rounded-full px-4 ring-1 ring-line"
        />
        <button type="submit" className="min-h-12 rounded-full bg-ink px-4 text-paper">
          {t("new")}
        </button>
      </form>
      {doc.projects.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      {doc.projects.map((project) => {
        const tasks = doc.items
          .filter(isTask)
          .filter((task) => task.projectId === project.id && task.status !== "completed");
        const notes = doc.items.filter(isNote).filter((note) => note.projectId === project.id);
        const next = tasks[0];
        return (
          <section
            key={project.id}
            className="rounded-[1.4rem] bg-paper-raised p-5 ring-1 ring-line"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-heading">{project.name}</h2>
              <ShareButton
                className="pill pill-muted"
                payload={{ title: project.name, text: project.name, source: "project", privacy: "private" }}
              />
            </div>
            {next ? (
              <div className="mt-3">
                <p className="text-xs text-muted">{t("next")}</p>
                <TaskCard
                  task={next}
                  onStart={() => start(next.id)}
                  onPause={() => pause(next.id)}
                  onComplete={() => complete(next.id)}
                />
              </div>
            ) : null}
            {tasks.slice(1).length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted">{t("upcoming")}</p>
                {tasks.slice(1).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={() => start(task.id)}
                    onPause={() => pause(task.id)}
                    onComplete={() => complete(task.id)}
                  />
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <BookmarkPicker target={{ kind: "project", id: project.id }} />
            </div>
            {notes.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <p className="col-span-full text-xs text-muted">{t("notes")}</p>
                {notes.map((note) => (
                  <StickyNote
                    key={note.id}
                    note={note}
                    onConvert={() => noteToTask(note.id)}
                    onPin={() => pin(note.id, !note.pinnedToday)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
