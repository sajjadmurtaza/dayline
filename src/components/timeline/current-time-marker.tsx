"use client";

import { useLocale, useTranslations } from "next-intl";
import { nowTop } from "@/components/timeline/geometry";

export function CurrentTimeMarker({ now }: { now: Date }) {
  const t = useTranslations("app.today");
  const a11y = useTranslations("common.a11y");
  const locale = useLocale();
  const time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      className="pointer-events-none absolute start-0 end-0 z-30 flex items-center gap-2 px-2"
      style={{ top: nowTop(now) }}
    >
      <div className="h-0.5 min-w-4 flex-1 bg-now" />
      <span
        className="flex items-center gap-1.5 rounded-full bg-now px-2.5 py-0.5 text-paper"
        suppressHydrationWarning
      >
        <span className="h-1.5 w-1.5 rounded-full bg-paper" aria-hidden />
        <span className="type-time text-[11px] tracking-[0.12em] uppercase">{t("nowLabel")}</span>
        <span className="type-time text-[11px]">{time}</span>
      </span>
      <div className="h-0.5 min-w-4 flex-1 bg-now" />
      <span className="sr-only">
        {a11y("nowMarker")} {time}
      </span>
    </div>
  );
}
