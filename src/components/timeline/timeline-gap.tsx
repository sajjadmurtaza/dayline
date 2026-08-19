"use client";

import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { gapHeight } from "@/components/timeline/spine";

export function TimelineGap({
  id,
  minutes,
  start,
  droppable = true,
}: {
  id: string;
  minutes: number;
  start: Date;
  droppable?: boolean;
}) {
  const t = useTranslations("app.today");
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !droppable,
    data: { startIso: start.toISOString() },
  });
  return (
    <div
      ref={setNodeRef}
      className="relative col-span-2 ms-[3.6rem]"
      style={{ height: gapHeight(minutes) }}
    >
      <div
        className={`absolute inset-y-1 start-0 end-4 rounded-xl ${isOver ? "bg-now/10 ring-1 ring-now/30" : ""}`}
        aria-hidden
      />
      {isOver ? (
        <p className="type-caption absolute inset-0 flex items-center justify-center text-now">
          {t("dropHere")}
        </p>
      ) : (
        <span className="sr-only">{t("dropHere")}</span>
      )}
    </div>
  );
}
