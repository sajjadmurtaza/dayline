"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const kinds = useTranslations("common.kind");
  const { capture, now } = useDayline();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const preview = previewCapture(text, now);
  const active = focused || Boolean(text.trim());

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    capture(text);
    setText("");
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
            onChange={(e) => setText(e.target.value)}
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
      {preview ? (
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
