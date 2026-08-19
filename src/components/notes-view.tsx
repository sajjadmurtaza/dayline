"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/page-title";
import { useDayline } from "@/components/app-provider";
import { StickyNote } from "@/components/sticky-note";
import { isNote } from "@/lib/types";

export function NotesView() {
  const t = useTranslations("app.notes");
  const common = useTranslations("common.actions");
  const { doc, newNote, noteToTask, pin } = useDayline();
  const [title, setTitle] = useState("");
  const notes = doc.items.filter(isNote);
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          newNote(title.trim(), title.trim());
          setTitle("");
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("new")}
          className="min-h-12 w-full rounded-full px-4 ring-1 ring-line"
        />
        <button type="submit" className="min-h-11 rounded-full bg-ink px-4 text-paper">
          {common("save")}
        </button>
      </form>
      {notes.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            onConvert={() => noteToTask(note.id)}
            onPin={() => pin(note.id, !note.pinnedToday)}
          />
        ))}
      </div>
    </div>
  );
}
