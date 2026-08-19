"use client";

import { useTranslations } from "next-intl";
import { Daymark } from "@/components/daymark";
import type { CompanionState } from "@/domains/planning/day-view";

export function Companion({
  state,
  message,
  label,
  name,
}: {
  state: CompanionState;
  message: string;
  label: string;
  name?: string;
}) {
  const companion = useTranslations("app.companion");
  const speaker = name ?? companion("name");
  if (state === "idle" && !message) return null;
  return (
    <aside className="flex items-end gap-2" aria-label={label}>
      <span className="flex shrink-0 flex-col items-center">
        <Daymark state={state === "idle" ? "idle" : state} />
        <span className="mt-0.5 text-[11px] font-bold">{speaker}</span>
      </span>
      <div className="speech-label min-w-0 flex-1">
        <p className="text-sm font-extrabold tracking-wide text-ok">{speaker}</p>
        <p className="type-companion mt-1 font-semibold leading-snug text-ink">{message}</p>
      </div>
    </aside>
  );
}
