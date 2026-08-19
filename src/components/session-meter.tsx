"use client";

import { useTranslations } from "next-intl";

export function SessionMeter({
  elapsed,
  estimate,
  live = true,
}: {
  elapsed: number;
  estimate: number | null;
  live?: boolean;
}) {
  const t = useTranslations("app.today");
  const duration = useTranslations("common.duration");
  const over = estimate != null && elapsed > estimate;
  const elapsedLabel = duration("minutes", { count: elapsed });
  const estimateLabel = estimate ? duration("minutes", { count: estimate }) : null;
  const percent =
    estimate && estimate > 0 ? Math.min(Math.round((elapsed / estimate) * 100), 96) : null;

  const line =
    over && estimateLabel
      ? `${t("elapsedOnly", { elapsed: elapsedLabel })} · ${t("estimatedAbout", { estimate: estimateLabel })} · ${t("longerThanPlanned", { minutes: elapsed - (estimate ?? 0) })}`
      : estimateLabel
        ? t("elapsedEstimate", { elapsed: elapsedLabel, estimate: estimateLabel })
        : t("elapsedOnly", { elapsed: elapsedLabel });

  return (
    <div className="mt-1 space-y-1.5">
      <p className={`type-caption ${over ? "text-now" : "text-ink"}`}>{line}</p>
      <div
        className="session-meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={estimate ?? undefined}
        aria-valuenow={elapsed}
        aria-busy={live}
      >
        <div
          className={`session-meter-fill${live ? " is-live" : ""}${percent == null ? " is-indeterminate" : ""}`}
          style={percent != null ? { width: `${Math.max(percent, 8)}%` } : undefined}
        />
      </div>
    </div>
  );
}
