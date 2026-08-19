"use client";

import { useTranslations } from "next-intl";
import { Companion } from "@/components/companion";
import type { DayNotice } from "@/domains/planning/day-view";

export function NoticeBanner({
  notice,
  companionLabel,
  onKeep,
  onWrapUp,
  onAdjust,
  onDismiss,
}: {
  notice: DayNotice;
  companionLabel: string;
  onKeep?: () => void;
  onWrapUp?: () => void;
  onAdjust?: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("app.notices");
  const message = t(notice.messageKey, {
    title: notice.title,
    minutes: notice.minutes ?? 0,
  });
  return (
    <div role="status" className="rounded-[1.25rem] bg-now/10 p-4 ring-1 ring-now/15">
      <Companion state={notice.companionState} message={message} label={companionLabel} />
      <div className="mt-3 flex flex-wrap gap-2 ps-12">
        {notice.kind === "upcoming" ? (
          <>
            {onWrapUp ? (
              <button type="button" className="pill pill-now" onClick={onWrapUp}>
                {t("wrapUp")}
              </button>
            ) : null}
            {onKeep ? (
              <button type="button" className="pill pill-muted" onClick={onKeep}>
                {t("keepGoing")}
              </button>
            ) : null}
          </>
        ) : null}
        {notice.kind === "overrun" ? (
          <>
            {onKeep ? (
              <button type="button" className="pill pill-now" onClick={onKeep}>
                {t("keepGoing")}
              </button>
            ) : null}
            {onAdjust ? (
              <button type="button" className="pill pill-muted" onClick={onAdjust}>
                {t("adjustDay")}
              </button>
            ) : null}
          </>
        ) : null}
        {notice.kind === "conflict" ? (
          <>
            {onAdjust ? (
              <button type="button" className="pill pill-now" onClick={onAdjust}>
                {t("showOptions")}
              </button>
            ) : null}
            <button type="button" className="pill pill-muted" onClick={onDismiss}>
              {t("ignore")}
            </button>
          </>
        ) : null}
        {notice.kind !== "conflict" ? (
          <button type="button" className="pill pill-muted" onClick={onDismiss}>
            {t("dismiss")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
