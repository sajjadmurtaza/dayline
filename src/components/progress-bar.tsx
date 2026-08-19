"use client";

import { SessionMeter } from "@/components/session-meter";

export function ProgressBar({
  elapsed,
  estimate,
  live = true,
}: {
  elapsed: number;
  estimate: number | null;
  live?: boolean;
}) {
  return <SessionMeter elapsed={elapsed} estimate={estimate} live={live} />;
}
