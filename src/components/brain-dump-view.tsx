"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { previewDump, useDayline } from "@/components/app-provider";
import { PageTitle } from "@/components/page-title";

export function BrainDumpView() {
  const t = useTranslations("app.brainDump");
  const kinds = useTranslations("common.kind");
  const actions = useTranslations("common.actions");
  const { dump, now } = useDayline();
  const [text, setText] = useState("");
  const suggestions = useMemo(() => previewDump(text, now), [now, text]);
  const [selected, setSelected] = useState<boolean[]>([]);

  function process(event: React.FormEvent) {
    event.preventDefault();
    const flags = suggestions.map((_, i) => selected[i] !== false);
    dump(text, flags);
    setText("");
    setSelected([]);
  }

  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      <p className="text-sm text-muted">{t("intro")}</p>
      <form onSubmit={process} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          className="min-h-48 w-full rounded-2xl p-4 ring-1 ring-line"
        />
        <button type="submit" className="min-h-11 rounded-full bg-ink px-4 text-paper">
          {t("process")}
        </button>
      </form>
      {suggestions.length > 0 ? (
        <ul className="space-y-2">
          {suggestions.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className="flex items-start gap-3 rounded-2xl bg-paper-raised p-3 ring-1 ring-line"
            >
              <input
                type="checkbox"
                checked={selected[index] !== false}
                onChange={(e) => {
                  const next = [...selected];
                  next[index] = e.target.checked;
                  setSelected(next);
                }}
              />
              <div>
                <p className="text-xs text-muted">{kinds(item.kind)}</p>
                <p className="font-semibold">{item.title}</p>
              </div>
            </li>
          ))}
          <li>
            <p className="text-xs text-muted">{actions("reviewSuggestions")}</p>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
