import type { BookmarkFolder } from "@/lib/types";

/** Quiet accents that sit on Dayline cream. Order is stable; assignment is not random. */
export const FOLDER_PALETTE = [
  { hue: 214, sat: 28, light: 46 },
  { hue: 150, sat: 22, light: 38 },
  { hue: 350, sat: 24, light: 48 },
  { hue: 36, sat: 34, light: 44 },
  { hue: 262, sat: 22, light: 50 },
  { hue: 176, sat: 26, light: 36 },
  { hue: 18, sat: 30, light: 44 },
  { hue: 220, sat: 10, light: 42 },
] as const;

export type FolderAccent = { hue: number; sat: number; light: number };

function hashId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function ancestorChain(folders: BookmarkFolder[], folderId: string) {
  const chain: BookmarkFolder[] = [];
  let current = folders.find((folder) => folder.id === folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? folders.find((folder) => folder.id === current?.parentId) : undefined;
  }
  return chain;
}

/** Same folder id always returns the same accent. Children stay in the root hue. */
export function folderAccent(folders: BookmarkFolder[], folderId: string): FolderAccent {
  const chain = ancestorChain(folders, folderId);
  const root = chain[0];
  if (!root) return { ...FOLDER_PALETTE[0] };
  const base = FOLDER_PALETTE[hashId(root.id) % FOLDER_PALETTE.length] ?? FOLDER_PALETTE[0];
  let accent: FolderAccent = { hue: base.hue, sat: base.sat, light: base.light };
  for (const folder of chain.slice(1)) {
    const mode = hashId(folder.id) % 3;
    if (mode === 0) {
      accent = { hue: accent.hue, sat: Math.max(10, accent.sat - 6), light: Math.min(62, accent.light + 12) };
    } else if (mode === 1) {
      accent = { hue: accent.hue, sat: Math.max(8, accent.sat - 14), light: Math.min(58, accent.light + 6) };
    } else {
      accent = { hue: accent.hue, sat: Math.min(36, accent.sat + 4), light: Math.max(30, accent.light - 8) };
    }
  }
  return accent;
}

export function accentColor(accent: FolderAccent) {
  return `hsl(${accent.hue} ${accent.sat}% ${accent.light}%)`;
}

/** percent is how much of the accent shows on cream. Cards stay near 8. */
export function accentMix(accent: FolderAccent, percent: number) {
  return `color-mix(in srgb, ${accentColor(accent)} ${percent}%, var(--paper))`;
}
