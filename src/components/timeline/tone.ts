import type { DaylineIconName } from "@/components/icons";
import type { TimedOccurrence } from "@/domains/planning/day-view";
import type { AreaId, Task } from "@/lib/types";

export type ItemTone = "event" | "task" | "personal" | "health" | "notes";

function areaTone(areaId: AreaId | null): ItemTone | null {
  if (areaId === "health") return "health";
  if (areaId === "personal" || areaId === "family") return "personal";
  return null;
}

export function occurrenceTone(occurrence: TimedOccurrence): ItemTone {
  const area = occurrence.task?.areaId ?? occurrence.event?.areaId ?? null;
  return areaTone(area) ?? (occurrence.kind === "event" ? "event" : "task");
}

export function taskTone(task: Task): ItemTone {
  return areaTone(task.areaId) ?? "task";
}

export function toneIcon(
  tone: ItemTone,
  kind: "task" | "event" | "note" = "task",
): DaylineIconName {
  if (kind === "note") return "notes";
  if (tone === "health") return "health";
  if (tone === "personal") return "personal";
  if (kind === "event" || tone === "event") return "meeting";
  return "task";
}

export const TONE_CLASS: Record<ItemTone, string> = {
  event: "text-event",
  task: "text-task",
  personal: "text-personal",
  health: "text-health",
  notes: "text-notes",
};

export const TONE_OBJECT: Record<ItemTone, string> = {
  event: "object-event",
  task: "object-task",
  personal: "object-personal",
  health: "object-health",
  notes: "object-notes",
};
