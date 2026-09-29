"use client";

import { useState } from "react";
import { isTask } from "@/lib/types";
import { useTranslations } from "next-intl";
import { pastedBookmarkUrl, urlSaveAs } from "@/domains/bookmarks/bookmarks";
import { Daymark } from "@/components/daymark";
import { previewCapture, useDayline } from "@/components/app-provider";

export function QuickCapture({
  autoFocus = false,
  showHint = true,
}: {
  autoFocus?: boolean;
  showHint?: boolean;
}) {
  const t = useTranslations("app.capture");
  const bookmarks = useTranslations("app.bookmarks");
  const kinds = useTranslations("common.kind");
  const { capture, now, saveBookmark, newNote, doc } = useDayline();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [saveAs, setSaveAs] = useState<"bookmark" | "task" | "note" | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [attachWork, setAttachWork] = useState(false);
  const preview = previewCapture(text, now);
  const linkChoices = urlSaveAs(text);
  const active = focused || Boolean(text.trim());
  const running = doc.items.filter(isTask).find((item) => item.status === "running") ?? null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    if (linkChoices && !saveAs) return;
    if (linkChoices && saveAs === "bookmark") {
      saveBookmark(
        { title: title || pastedBookmarkUrl(text) || text, url: text, folderId },
        attachWork && running ? { kind: "task", id: running.id } : null,
      );
    } else if (linkChoices && saveAs === "note") {
      newNote(title || text, text);
    } else if (linkChoices && saveAs === "task") {
      capture(title || text);
    } else if (!linkChoices) {
      capture(text);
    }
    setText("");
    setSaveAs(null);
    setTitle("");
    setAttachWork(false);
  }

  return (
    <form data-readme="today-capture" onSubmit={submit} className="space-y-2">
      <label className="sr-only" htmlFor="quick-capture">
        {t("placeholder")}
      </label>
      <div className={`capture-well p-2 ring-1 ${active ? "ring-now/70" : "ring-line/80"}`}>
        <div className="flex items-start gap-2">
          <span className="ms-2 mt-2.5 text-2xl font-semibold leading-none text-now" aria-hidden>
            +
          </span>
          <textarea
            id="quick-capture"
            autoFocus={autoFocus}
            rows={active ? 2 : 1}
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value);
              setSaveAs(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t("placeholder")}
            className="min-h-11 w-full resize-none bg-transparent px-1 py-2 text-base outline-none"
          />
          <span className="me-1 mt-1">
            <Daymark state={preview ? "thinking" : "idle"} size={32} />
          </span>
        </div>
      </div>
      {linkChoices ? (
        <div className="space-y-2 ps-1">
          <p className="type-caption">{bookmarks("saveAs")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" onClick={() => setSaveAs("bookmark")}>{bookmarks("asBookmark")}</button>
            <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" onClick={() => setSaveAs("task")}>{bookmarks("asTask")}</button>
            <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" onClick={() => setSaveAs("note")}>{bookmarks("asNote")}</button>
          </div>
          {saveAs === "bookmark" ? (
            <div className="space-y-2">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={bookmarks("name")} className="min-h-11 w-full rounded-full px-4 ring-1 ring-line" />
              <select value={folderId ?? ""} onChange={(event) => setFolderId(event.target.value || null)} className="min-h-11 w-full rounded-full px-4 ring-1 ring-line">
                <option value="">{bookmarks("unsorted")}</option>
                {doc.bookmarkFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
              {running ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={attachWork} onChange={(event) => setAttachWork(event.target.checked)} />
                  {bookmarks("attach")}
                </label>
              ) : null}
              <button type="submit" className="type-button min-h-11 rounded-full bg-now px-4 text-paper">{bookmarks("save")}</button>
            </div>
          ) : null}
          {saveAs === "task" || saveAs === "note" ? (
            <button type="submit" className="type-button min-h-11 rounded-full bg-now px-4 text-paper">{bookmarks("save")}</button>
          ) : null}
        </div>
      ) : preview ? (
        <div className="flex flex-wrap items-center gap-2 ps-1">
          <span className="rounded-full bg-paper-raised px-3 py-1.5 type-caption text-ink ring-1 ring-line">
            {t("classifiedAs", { kind: kinds(preview.kind) })}
            {preview.estimatedMinutes
              ? ` · ${t("suggestedEstimate", { minutes: preview.estimatedMinutes })}`
              : null}
          </span>
          <button
            type="submit"
            className="type-button min-h-11 rounded-full bg-now px-4 text-paper"
          >
            {t("confirm")}
          </button>
        </div>
      ) : showHint ? (
        <p className="px-1 type-caption">{t("hint")}</p>
      ) : null}
    </form>
  );
}
