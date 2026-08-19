"use client";

import { useTranslations } from "next-intl";
import { DURATION_PRESETS } from "@/lib/types";

export function DurationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  const t = useTranslations("common.duration");
  return (
    <div className="flex flex-wrap gap-1">
      {DURATION_PRESETS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onChange(minutes)}
          className={`min-h-11 rounded-full px-3 text-sm ${
            value === minutes ? "bg-ink text-paper" : "bg-paper-raised text-ink ring-1 ring-line"
          }`}
        >
          {t("minutes", { count: minutes })}
        </button>
      ))}
    </div>
  );
}
