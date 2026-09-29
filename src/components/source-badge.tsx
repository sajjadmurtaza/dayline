"use client";

import { useTranslations } from "next-intl";
import type { ItemSource } from "@/lib/types";

export function SourceBadge({ source }: { source: ItemSource }) {
  const t = useTranslations("common.source");
  const label =
    source.kind === "connector"
      ? t(source.connectorId)
      : source.kind === "calendar-import"
        ? t("ics-file")
        : source.kind === "calendar-feed"
          ? t("calendar-feed")
          : t("local");
  return (
    <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line">
      {label}
    </span>
  );
}
