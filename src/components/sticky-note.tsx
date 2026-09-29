"use client";

import { useTranslations } from "next-intl";
import { ShareButton } from "@/components/share/ShareButton";
import type { Note } from "@/lib/types";

function pinTilt(id: string) {
  const n = id.charCodeAt(id.length - 1) + id.charCodeAt(0);
  return n % 2 === 0 ? "-1.4deg" : "1.15deg";
}

export function StickyNote({
  note,
  onConvert,
  onPin,
}: {
  note: Note;
  onConvert?: () => void;
  onPin?: () => void;
}) {
  const t = useTranslations("common");
  const app = useTranslations("app.notes");
  return (
    <article
      className="note-pin min-h-32 p-4 text-ink"
      style={{ transform: `rotate(${pinTilt(note.id)})` }}
    >
      <p className="type-caption font-semibold uppercase tracking-[0.12em] text-ink/60">
        {t(`noteType.${note.noteType}`)}
      </p>
      <p className="type-title mt-2 font-semibold">{note.title}</p>
      <p className="mt-1 text-sm leading-snug">{note.body}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {onConvert ? (
          <button type="button" className="pill pill-muted" onClick={onConvert}>
            {t("actions.convertToTask")}
          </button>
        ) : null}
        {onPin ? (
          <button type="button" className="pill pill-muted" onClick={onPin}>
            {note.pinnedToday ? app("unpin") : app("pinToday")}
          </button>
        ) : null}
        <ShareButton
          className="pill pill-muted"
          payload={{
            title: note.title,
            text: [note.title, note.body].filter(Boolean).join("\n"),
            source: "note",
            privacy: "private",
          }}
        />
      </div>
    </article>
  );
}
