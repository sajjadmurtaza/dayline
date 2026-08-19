import { parseCapture, type CaptureSuggestion } from "@/domains/capture/parse";

export function processBrainDump(text: string, now: Date): CaptureSuggestion[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseCapture(line, now))
    .filter((item): item is CaptureSuggestion => item !== null);
}
