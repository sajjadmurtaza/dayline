import { createId } from "@/lib/id";
import type { Bookmark, BookmarkFolder, BookmarkFolderPlacement, StoreDocument } from "@/lib/types";
import { createBookmark, findBookmarkByUrl, placeBookmark, prepareLink } from "@/domains/bookmarks/bookmarks";

export type NetscapePreview = {
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  placements: BookmarkFolderPlacement[];
  folderCount: number;
  bookmarkCount: number;
  duplicateCount: number;
  localFileCount: number;
};

type DraftFolder = { id: string; name: string; parentId: string | null };

export function importNetscapeBookmarks(html: string, now = Date.now()): NetscapePreview {
  const folders: DraftFolder[] = [];
  const links: { title: string; href: string; folderId: string | null; added?: number }[] = [];
  const cleaned = html.replace(/\s(?:ICON|ICON_URI)="[^"]*"/gi, "");
  const pattern = /<DL\b[^>]*>|<\/DL>|<H3\b[^>]*>([\s\S]*?)<\/H3>|<A\b([^>]*)>([\s\S]*?)<\/A>/gi;
  const stack: Array<string | null> = [];
  let nextParent: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(cleaned))) {
    const token = match[0].slice(0, 4).toLowerCase();
    if (token === "<dl>") {
      stack.push(nextParent);
      nextParent = null;
    } else if (token === "</dl") {
      stack.pop();
    } else if (token.startsWith("<h3")) {
      const folder: DraftFolder = {
        id: createId(),
        name: decodeText(match[1] ?? "") || "Folder",
        parentId: stack.at(-1) ?? null,
      };
      folders.push(folder);
      nextParent = folder.id;
    } else if (token.startsWith("<a ")) {
      const href = attr(match[2] ?? "", "href");
      if (!href) continue;
      const added = Number(attr(match[2] ?? "", "add_date"));
      links.push({
        title: decodeText(match[3] ?? "") || href,
        href,
        folderId: stack.at(-1) ?? null,
        added: Number.isFinite(added) && added > 0 ? added * 1000 : undefined,
      });
    }
  }

  const seen = new Map<string, string>();
  const bookmarks: Bookmark[] = [];
  const placements: BookmarkFolderPlacement[] = [];
  let duplicateCount = 0;
  let localFileCount = 0;

  for (const link of links) {
    const prepared = prepareLink(link.href);
    if (!prepared) continue;
    if (prepared.isLocalFile) localFileCount += 1;
    const prior = seen.get(prepared.normalizedUrl);
    if (prior) {
      duplicateCount += 1;
      if (link.folderId) placements.push({ bookmarkId: prior, folderId: link.folderId });
      continue;
    }
    const bookmark: Bookmark = {
      id: createId(),
      title: link.title || prepared.domain || link.href,
      url: prepared.url,
      normalizedUrl: prepared.normalizedUrl,
      domain: prepared.domain,
      tags: [],
      pinned: false,
      archived: false,
      source: { kind: "browser-import", importer: "netscape-html", importedAt: now },
      createdAt: link.added ?? now,
      updatedAt: now,
      chromeAddedAt: link.added,
      isLocalFile: prepared.isLocalFile,
    };
    seen.set(prepared.normalizedUrl, bookmark.id);
    bookmarks.push(bookmark);
    if (link.folderId) placements.push({ bookmarkId: bookmark.id, folderId: link.folderId });
  }

  return {
    folders: folders.map((folder) => ({ ...folder, createdAt: now, updatedAt: now })),
    bookmarks,
    placements,
    folderCount: folders.length,
    bookmarkCount: bookmarks.length,
    duplicateCount,
    localFileCount,
  };
}

export function previewMutatesStore(before: StoreDocument, preview: NetscapePreview): boolean {
  return preview.bookmarks.some((item) => before.bookmarks.some((saved) => saved.id === item.id));
}

export function acceptBookmarkImport(
  doc: StoreDocument,
  preview: NetscapePreview,
  selectedFolderIds: string[] | null = null,
): StoreDocument {
  const allowed = selectedFolderIds ? new Set(selectedFolderIds) : null;
  const folders = preview.folders.filter((folder) => !allowed || folderKept(folder, preview.folders, allowed));
  const folderIds = new Set(folders.map((folder) => folder.id));
  let next: StoreDocument = {
    ...doc,
    bookmarkFolders: mergeFolders(doc.bookmarkFolders, folders),
  };
  for (const bookmark of preview.bookmarks) {
    const places = preview.placements.filter(
      (place) => place.bookmarkId === bookmark.id && folderIds.has(place.folderId),
    );
    if (allowed && places.length === 0 && preview.placements.some((place) => place.bookmarkId === bookmark.id)) {
      continue;
    }
    const existing = findBookmarkByUrl(next, bookmark.url);
    if (existing) {
      for (const place of places) next = placeBookmark(next, existing.id, place.folderId);
      continue;
    }
    const saved = createBookmark(next, {
      title: bookmark.title,
      url: bookmark.url,
      folderId: places[0]?.folderId ?? null,
      source: bookmark.source,
    });
    if (!saved) continue;
    next = saved.doc;
    for (const place of places.slice(1)) next = placeBookmark(next, saved.bookmark.id, place.folderId);
  }
  return next;
}

function attr(source: string, name: string): string {
  const found = source.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return found?.[1] ?? "";
}

function decodeText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function folderKept(folder: BookmarkFolder, all: BookmarkFolder[], selected: Set<string>): boolean {
  if (selected.has(folder.id)) return true;
  return all.some((item) => item.parentId === folder.id && folderKept(item, all, selected));
}

function mergeFolders(current: BookmarkFolder[], incoming: BookmarkFolder[]): BookmarkFolder[] {
  const ids = new Set(current.map((folder) => folder.id));
  return [...current, ...incoming.filter((folder) => !ids.has(folder.id))];
}
