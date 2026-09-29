"use client";

import { useLocale, useTranslations } from "next-intl";
import type { DaySnapshot } from "@/domains/planning/day-view";

function formatTime(date: Date, locale: string) {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function TodaySummary({ snapshot }: { snapshot: DaySnapshot }) {
  const t = useTranslations("app.today");
  const locale = useLocale();
  const nowItem = snapshot.nowOccurrence;
  const nextItem = snapshot.nextOccurrence;
  const nowTitle = nowItem?.event?.title ?? nowItem?.task?.title;
  const nextTitle = nextItem?.event?.title ?? nextItem?.task?.title;

  let nowLine: string;
  if (nowItem?.task?.status === "running") {
    nowLine = t("summaryNowTask", { title: nowTitle ?? "" });
  } else if (nowItem?.kind === "event") {
    nowLine = t("summaryNowEvent", {
      title: nowTitle ?? "",
      time: formatTime(nowItem.end, locale),
    });
  } else if (nowItem?.kind === "task") {
    nowLine = t("summaryNowTask", { title: nowTitle ?? "" });
  } else {
    nowLine = t("summaryNowFree");
  }

  const follow =
    nextItem && snapshot.minutesFree != null
      ? t("summaryTimeUntil", { minutes: snapshot.minutesFree, title: nextTitle ?? "" })
      : nextItem
        ? t("summaryNext", {
            title: nextTitle ?? "",
            time: formatTime(nextItem.start, locale),
          })
        : t("summaryNextNone");

  return (
    <div className="space-y-1" suppressHydrationWarning>
      {snapshot.usableMinutes > 0 ? (
        <p className="type-title">{t("yoursToday", { minutes: snapshot.usableMinutes })}</p>
      ) : (
        <p className="type-title">{nowLine}</p>
      )}
      {snapshot.externalCalendar ? <p className="type-caption">{t("takenLine")}</p> : null}
      <p className="type-companion text-ink/80">{follow}</p>
    </div>
  );
}
