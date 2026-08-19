"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatClock } from "@/lib/dates";

export function NowMarker({ now }: { now: Date }) {
  const t = useTranslations("app.today");
  const a11y = useTranslations("common.a11y");
  const locale = useLocale();
  const time = formatClock(now, locale);
  return (
    <div id="dayline-now" className="now-cut relative z-20 my-1 scroll-mt-24 py-2">
      <span className="now-cut-line" aria-hidden />
      <span className="type-time shrink-0 tracking-[0.14em] text-now uppercase">
        {t("nowLabel")} · <span suppressHydrationWarning>{time}</span>
      </span>
      <span className="now-cut-line" aria-hidden />
      <span className="sr-only">
        {a11y("nowMarker")} {time}
      </span>
    </div>
  );
}
