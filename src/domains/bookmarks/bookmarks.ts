import { createId } from "@/lib/id";
import type {
  Bookmark,
  BookmarkAttachment,
  BookmarkFolder,
  BookmarkFolderPlacement,
  StoreDocument,
} from "@/lib/types";

const TRACKING = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i;

export type PreparedLink = {
  url: string;
  normalizedUrl: string;
  domain: string;
  isLocalFile: boolean;
};

export type BookmarkMatch = {
  bookmark: Bookmark;
  score: number;
  reason: "title" | "domain" | "tag" | "folder" | "note" | "url";
};

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/www\./g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const URL_SAVE_AS = ["bookmark", "task", "note"] as const;

export function urlSaveAs(text: string): readonly ["bookmark", "task", "note"] | null {
  return pastedBookmarkUrl(text) ? URL_SAVE_AS : null;
}

export function pastedBookmarkUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!/^(https?:\/\/|file:\/\/)\S+$/i.test(trimmed)) return null;
  return prepareLink(trimmed)?.url ?? null;
}

export function prepareLink(raw: string): PreparedLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^file:/i.test(trimmed)) {
    return {
      url: trimmed,
      normalizedUrl: trimmed.replace(/\/+$/, ""),
      domain: "local",
      isLocalFile: true,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams) {
    if (TRACKING.test(key)) continue;
    params.append(key, value);
  }
  const query = params.toString();
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  const normalizedUrl = `${parsed.protocol}//${host}${path}${query ? `?${query}` : ""}${parsed.hash}`;
  return { url: trimmed, normalizedUrl, domain: host, isLocalFile: false };
}

export function findBookmarkByUrl(doc: StoreDocument, raw: string): Bookmark | null {
  const prepared = prepareLink(raw);
  if (!prepared) return null;
  return doc.bookmarks.find((item) => item.normalizedUrl === prepared.normalizedUrl) ?? null;
}

export function folderPath(folders: BookmarkFolder[], folderId: string | null): string[] {
  const names: string[] = [];
  let current = folderId ? folders.find((folder) => folder.id === folderId) : undefined;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentId
      ? folders.find((folder) => folder.id === current?.parentId)
      : undefined;
  }
  return names;
}

export function bookmarkSearchText(
  bookmark: Bookmark,
  folders: BookmarkFolder[],
  placements: BookmarkFolderPlacement[],
): string {
  const paths = placements
    .filter((place) => place.bookmarkId === bookmark.id)
    .flatMap((place) => folderPath(folders, place.folderId));
  return normalizeSearchText(
    [bookmark.title, bookmark.url, bookmark.domain, bookmark.note ?? "", ...bookmark.tags, ...paths].join(
      " ",
    ),
  );
}

function fieldScore(title: string, domain: string, tags: string, folders: string, note: string, url: string, query: string, tokens: string[]): BookmarkMatch["reason"] | null {
  const hasAll = (value: string) => tokens.every((token) => value.includes(token));
  if (title === query) return "title";
  if (title.startsWith(query) || title.startsWith(tokens[0] ?? query)) return "title";
  if (hasAll(title)) return "title";
  if (hasAll(domain)) return "domain";
  if (hasAll(tags)) return "tag";
  if (hasAll(folders)) return "folder";
  if (hasAll(note)) return "note";
  if (hasAll(url)) return "url";
  return null;
}

const RANK: Record<BookmarkMatch["reason"], number> = {
  title: 80,
  domain: 60,
  tag: 50,
  folder: 40,
  note: 30,
  url: 20,
};

export function searchBookmarks(
  query: string,
  bookmarks: Bookmark[],
  folders: BookmarkFolder[],
  placements: BookmarkFolderPlacement[] = [],
): BookmarkMatch[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const tokens = q.split(" ").filter(Boolean);
  const matches: BookmarkMatch[] = [];
  for (const bookmark of bookmarks) {
    if (bookmark.archived) continue;
    const title = normalizeSearchText(bookmark.title);
    const domain = normalizeSearchText(bookmark.domain);
    const tags = normalizeSearchText(bookmark.tags.join(" "));
    const note = normalizeSearchText(bookmark.note ?? "");
    const url = normalizeSearchText(bookmark.url);
    const paths = placements
      .filter((place) => place.bookmarkId === bookmark.id)
      .map((place) => folderPath(folders, place.folderId).join(" "))
      .join(" ");
    const foldersText = normalizeSearchText(paths);
    const haystack = [title, domain, tags, foldersText, note, url].join(" ");
    if (!tokens.every((token) => haystack.includes(token))) continue;
    const reason = fieldScore(title, domain, tags, foldersText, note, url, q, tokens);
    if (!reason) continue;
    const exact = title === q ? 100 : title.startsWith(q) ? 90 : RANK[reason];
    matches.push({ bookmark, score: reason === "title" ? exact : RANK[reason], reason });
  }
  return matches.sort((a, b) => b.score - a.score || a.bookmark.title.localeCompare(b.bookmark.title));
}

export function getPinnedBookmarks(doc: StoreDocument): Bookmark[] {
  return doc.bookmarks.filter((item) => item.pinned && !item.archived);
}

export function getRecentBookmarks(doc: StoreDocument, limit = 12): Bookmark[] {
  return [...doc.bookmarks]
    .filter((item) => !item.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function getAttachedBookmarks(doc: StoreDocument): Bookmark[] {
  const ids = new Set(doc.bookmarkAttachments.map((item) => item.bookmarkId));
  return doc.bookmarks.filter((item) => ids.has(item.id) && !item.archived);
}

export function getUnsortedBookmarks(doc: StoreDocument): Bookmark[] {
  const placed = new Set(doc.bookmarkPlacements.map((item) => item.bookmarkId));
  return doc.bookmarks.filter((item) => !placed.has(item.id) && !item.archived);
}

export function getLocalFileBookmarks(doc: StoreDocument): Bookmark[] {
  return doc.bookmarks.filter((item) => item.isLocalFile && !item.archived);
}

export function getDuplicateCandidates(doc: StoreDocument): Bookmark[][] {
  const groups = new Map<string, Bookmark[]>();
  for (const bookmark of doc.bookmarks) {
    const list = groups.get(bookmark.normalizedUrl) ?? [];
    list.push(bookmark);
    groups.set(bookmark.normalizedUrl, list);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function attachmentsFor(
  doc: StoreDocument,
  kind: BookmarkAttachment["target"]["kind"],
  id: string,
): Bookmark[] {
  const ids = doc.bookmarkAttachments
    .filter((item) => item.target.kind === kind && item.target.id === id)
    .map((item) => item.bookmarkId);
  return doc.bookmarks.filter((item) => ids.includes(item.id));
}

export function createBookmark(
  doc: StoreDocument,
  input: {
    title: string;
    url: string;
    note?: string;
    tags?: string[];
    folderId?: string | null;
    source?: Bookmark["source"];
  },
  now = Date.now(),
): { doc: StoreDocument; bookmark: Bookmark; created: boolean } | null {
  const prepared = prepareLink(input.url);
  if (!prepared) return null;
  const existing = findBookmarkByUrl(doc, input.url);
  if (existing) {
    const next = input.folderId ? placeBookmark(doc, existing.id, input.folderId) : doc;
    return { doc: next, bookmark: existing, created: false };
  }
  const bookmark: Bookmark = {
    id: createId(),
    title: input.title.trim() || prepared.domain || input.url,
    url: prepared.url,
    normalizedUrl: prepared.normalizedUrl,
    domain: prepared.domain,
    note: input.note?.trim() || undefined,
    tags: input.tags ?? [],
    pinned: false,
    archived: false,
    source: input.source ?? { kind: "dayline" },
    createdAt: now,
    updatedAt: now,
    isLocalFile: prepared.isLocalFile,
  };
  let next: StoreDocument = { ...doc, bookmarks: [...doc.bookmarks, bookmark] };
  if (input.folderId) next = placeBookmark(next, bookmark.id, input.folderId);
  return { doc: next, bookmark, created: true };
}

export function placeBookmark(doc: StoreDocument, bookmarkId: string, folderId: string): StoreDocument {
  const exists = doc.bookmarkPlacements.some(
    (item) => item.bookmarkId === bookmarkId && item.folderId === folderId,
  );
  if (exists) return doc;
  return {
    ...doc,
    bookmarkPlacements: [...doc.bookmarkPlacements, { bookmarkId, folderId }],
  };
}

export function updateBookmark(
  doc: StoreDocument,
  id: string,
  patch: Partial<Pick<Bookmark, "title" | "url" | "note" | "tags" | "pinned" | "archived">>,
  now = Date.now(),
): StoreDocument {
  return {
    ...doc,
    bookmarks: doc.bookmarks.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch, updatedAt: now };
      if (patch.url && patch.url !== item.url) {
        const prepared = prepareLink(patch.url);
        if (!prepared) return item;
        next.url = prepared.url;
        next.normalizedUrl = prepared.normalizedUrl;
        next.domain = prepared.domain;
        next.isLocalFile = prepared.isLocalFile;
      }
      return next;
    }),
  };
}

export function deleteBookmark(doc: StoreDocument, id: string): StoreDocument {
  return {
    ...doc,
    bookmarks: doc.bookmarks.filter((item) => item.id !== id),
    bookmarkPlacements: doc.bookmarkPlacements.filter((item) => item.bookmarkId !== id),
    bookmarkAttachments: doc.bookmarkAttachments.filter((item) => item.bookmarkId !== id),
  };
}

export function createFolder(
  doc: StoreDocument,
  name: string,
  parentId: string | null = null,
  now = Date.now(),
): StoreDocument {
  const folder: BookmarkFolder = {
    id: createId(),
    name: name.trim(),
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  return { ...doc, bookmarkFolders: [...doc.bookmarkFolders, folder] };
}

export function renameFolder(doc: StoreDocument, id: string, name: string, now = Date.now()): StoreDocument {
  return {
    ...doc,
    bookmarkFolders: doc.bookmarkFolders.map((folder) =>
      folder.id === id ? { ...folder, name: name.trim(), updatedAt: now } : folder,
    ),
  };
}

export function deleteFolder(doc: StoreDocument, id: string): StoreDocument {
  const childIds = doc.bookmarkFolders.filter((folder) => folder.parentId === id).map((folder) => folder.id);
  let next = doc;
  for (const child of childIds) next = deleteFolder(next, child);
  return {
    ...next,
    bookmarkFolders: next.bookmarkFolders.filter((folder) => folder.id !== id),
    bookmarkPlacements: next.bookmarkPlacements.filter((place) => place.folderId !== id),
  };
}

export function moveBookmark(
  doc: StoreDocument,
  bookmarkId: string,
  fromFolderId: string | null,
  toFolderId: string | null,
): StoreDocument {
  let placements = doc.bookmarkPlacements.filter(
    (place) => !(place.bookmarkId === bookmarkId && place.folderId === fromFolderId),
  );
  if (toFolderId && !placements.some((place) => place.bookmarkId === bookmarkId && place.folderId === toFolderId)) {
    placements = [...placements, { bookmarkId, folderId: toFolderId }];
  }
  return { ...doc, bookmarkPlacements: placements };
}

export function attachBookmark(
  doc: StoreDocument,
  bookmarkId: string,
  target: BookmarkAttachment["target"],
  now = Date.now(),
): StoreDocument {
  const exists = doc.bookmarkAttachments.some(
    (item) =>
      item.bookmarkId === bookmarkId && item.target.kind === target.kind && item.target.id === target.id,
  );
  if (exists) return doc;
  const attachment: BookmarkAttachment = { id: createId(), bookmarkId, target, createdAt: now };
  return { ...doc, bookmarkAttachments: [...doc.bookmarkAttachments, attachment] };
}

export function detachBookmark(doc: StoreDocument, attachmentId: string): StoreDocument {
  return {
    ...doc,
    bookmarkAttachments: doc.bookmarkAttachments.filter((item) => item.id !== attachmentId),
  };
}

export type BookmarkSeed = {
  folders: { id: string; name: string; parentId: string | null }[];
  bookmarks: {
    id: string;
    title: string;
    url: string;
    folderIds: string[];
    addedAt?: string | number;
    isLocalFile?: boolean;
  }[];
};

export function importBookmarkSeed(doc: StoreDocument, seed: BookmarkSeed, now = Date.now()): StoreDocument {
  let next = doc;
  const known = new Set(next.bookmarkFolders.map((folder) => folder.id));
  for (const folder of seed.folders) {
    if (known.has(folder.id)) continue;
    next = {
      ...next,
      bookmarkFolders: [
        ...next.bookmarkFolders,
        { ...folder, createdAt: now, updatedAt: now },
      ],
    };
    known.add(folder.id);
  }
  for (const item of seed.bookmarks) {
    const saved = createBookmark(
      next,
      { title: item.title, url: item.url, folderId: item.folderIds[0] ?? null },
      typeof item.addedAt === "number" ? item.addedAt : now,
    );
    if (!saved) continue;
    next = saved.doc;
    for (const folderId of item.folderIds.slice(saved.created ? 1 : 0)) {
      next = placeBookmark(next, saved.bookmark.id, folderId);
    }
  }
  return next;
}
