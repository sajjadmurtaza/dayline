"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import {
  attachmentsFor,
  findBookmarkByUrl,
  folderPath,
  getAttachedBookmarks,
  getDuplicateCandidates,
  getLocalFileBookmarks,
  getPinnedBookmarks,
  getRecentBookmarks,
  getUnsortedBookmarks,
  searchBookmarks,
} from "@/domains/bookmarks/bookmarks";
import { importNetscapeBookmarks, type NetscapePreview } from "@/domains/bookmarks/netscape";
import { accentColor, accentMix, folderAccent, type FolderAccent } from "@/lib/bookmark-folder-accent";
import type { Bookmark, BookmarkFolder, BookmarkFolderPlacement, StoreDocument } from "@/lib/types";
import { ShareButton } from "@/components/share/ShareButton";
import { bookmarkSharePayload } from "@/domains/share/shareUrl";
import { useDayline } from "@/components/app-provider";

const VIEW_KEY = "dayline.bookmarks.presentation";

type Chrome = {
  foldersOpen: boolean;
  cards: boolean;
  hideArchived: boolean;
  hideLocal: boolean;
  hideEmpty: boolean;
  expanded: string[];
  hidden: string[];
  showAll: boolean;
  selectedFolder: string | null;
};

const DEFAULT_CHROME: Chrome = {
  foldersOpen: true,
  cards: true,
  hideArchived: true,
  hideLocal: false,
  hideEmpty: true,
  expanded: [],
  hidden: [],
  showAll: false,
  selectedFolder: null,
};

type SearchScope = "folder" | "all";

export function BookmarksView() {
  const app = useDayline();
  const copy = useTranslations("app.bookmarks");
  const doc = app.doc;
  const searchRef = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchScope, setSearchScope] = useState<SearchScope>("folder");
  const [sheet, setSheet] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [preview, setPreview] = useState<NetscapePreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [imported, setImported] = useState<{ bookmarks: number; folders: number } | null>(null);
  const [chrome, setChrome] = useState<Chrome>(DEFAULT_CHROME);
  const prefsReady = useRef(false);
  const loadedChrome = useRef<string | null>(null);

  useLayoutEffect(() => {
    const raw = window.localStorage.getItem(VIEW_KEY);
    let next = DEFAULT_CHROME;
    if (raw) {
      try {
        next = { ...DEFAULT_CHROME, ...(JSON.parse(raw) as Partial<Chrome>) };
      } catch {
        next = DEFAULT_CHROME;
      }
    }
    next = { ...next, showAll: false };
    loadedChrome.current = JSON.stringify(next);
    prefsReady.current = true;
    // Restore hide/show and the open folder before a default write can replace them.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local presentation preference
    setChrome(next);
  }, []);

  useEffect(() => {
    if (!prefsReady.current) return;
    const json = JSON.stringify(chrome);
    if (loadedChrome.current !== null) {
      if (json !== loadedChrome.current) return;
      loadedChrome.current = null;
      return;
    }
    window.localStorage.setItem(VIEW_KEY, json);
  }, [chrome]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(
    () => doc.bookmarks.filter((item) => (chrome.hideArchived ? !item.archived : true) && (chrome.hideLocal ? !item.isLocalFile : true)),
    [chrome.hideArchived, chrome.hideLocal, doc.bookmarks],
  );
  const folderId = doc.bookmarkFolders.some((folder) => folder.id === chrome.selectedFolder) ? chrome.selectedFolder : null;
  const activeFolder = doc.bookmarkFolders.find((folder) => folder.id === folderId) ?? null;
  const inFolder = useMemo(
    () => (folderId ? bookmarksInTree(visible, doc.bookmarkFolders, doc.bookmarkPlacements, folderId) : visible),
    [doc.bookmarkFolders, doc.bookmarkPlacements, folderId, visible],
  );
  const listed = useMemo(() => applyFilter(filter, folderId ? inFolder : visible, doc), [doc, filter, folderId, inFolder, visible]);
  const searchPool = folderId && searchScope === "folder" ? inFolder : visible;
  const hits = useMemo(() => {
    if (!query.trim()) return [];
    return searchBookmarks(query, searchPool, doc.bookmarkFolders, doc.bookmarkPlacements).map((hit) => hit.bookmark);
  }, [doc.bookmarkFolders, doc.bookmarkPlacements, query, searchPool]);
  const searching = query.trim().length > 0;
  const overview = !searching && filter === "all" && !folderId && !chrome.showAll;
  const showPanel = chrome.foldersOpen && !overview;
  const peek = doc.bookmarks.find((item) => item.id === peekId) ?? null;
  const roots = doc.bookmarkFolders.filter((folder) => folder.parentId === null);

  function patch(next: Partial<Chrome>) {
    setChrome((current) => ({ ...current, ...next }));
  }

  function selectFolder(id: string | null) {
    setSearchScope("folder");
    setFilter("all");
    setQuery("");
    setCursor(0);
    setSheet(false);
    setChrome((current) => ({
      ...current,
      selectedFolder: id,
      showAll: false,
      expanded: id ? [...new Set([...current.expanded, ...ancestorIds(doc.bookmarkFolders, id)])] : current.expanded,
    }));
  }

  function chooseLoose(next: "unsorted" | "duplicates") {
    selectFolder(null);
    setFilter(next);
  }

  function toggleExpanded(id: string) {
    setChrome((current) => ({
      ...current,
      expanded: current.expanded.includes(id) ? current.expanded.filter((item) => item !== id) : [...current.expanded, id],
    }));
  }

  const placeholder = activeFolder && searchScope === "folder" ? copy("searchFolder", { name: activeFolder.name }) : copy("searchAll");
  const pathFor = (id: string) => placedPath(id, doc.bookmarkFolders, doc.bookmarkPlacements);
  const tintFor = (id: string) => {
    const place = placementFor(id, doc.bookmarkPlacements, doc.bookmarkFolders, folderId);
    return place ? folderAccent(doc.bookmarkFolders, place) : null;
  };

  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <h1 className="type-display">{copy("title")}</h1>
        <button type="button" className="min-h-12 shrink-0 rounded-full bg-now px-5 text-paper" onClick={() => setEditing(blank())}>
          + {copy("add")}
        </button>
      </header>
      <div className="sticky top-0 z-20 -mx-1 space-y-3 bg-paper/95 px-1 py-2 backdrop-blur">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-free px-4 ring-1 ring-line">
          <span className="sr-only">{copy("find")}</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => onSearchKey(event, hits, cursor, setCursor, setPeekId, setQuery)}
            placeholder={placeholder}
            className="min-h-12 w-full bg-transparent text-base outline-none"
          />
          <kbd className="hidden text-sm text-muted sm:inline">⌘K</kbd>
        </label>
        {activeFolder ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">{copy("searchIn")}</span>
            <button type="button" aria-pressed={searchScope === "folder"} className={chip(searchScope === "folder")} onClick={() => setSearchScope("folder")}>
              {copy("thisFolder")}
            </button>
            <button type="button" aria-pressed={searchScope === "all"} className={chip(searchScope === "all")} onClick={() => setSearchScope("all")}>
              {copy("allBookmarks")}
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", copy("all")],
            ["pinned", copy("pinned")],
            ["attached", copy("attached")],
            ["recent", copy("recent")],
            ["local", copy("local")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            className={chip(filter === key)}
            onClick={() => {
              setFilter(key);
              setQuery("");
            }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="min-h-11 rounded-full px-4 text-sm ring-1 ring-line lg:hidden"
          aria-expanded={sheet}
          aria-controls="bookmark-folders-sheet"
          onClick={() => setSheet((open) => !open)}
        >
          {copy("folders")}
        </button>
        {overview ? null : (
          <button
            type="button"
            className="min-h-11 rounded-full px-4 text-sm ring-1 ring-line lg:ms-auto"
            aria-expanded={chrome.foldersOpen}
            aria-controls="bookmark-folders"
            onClick={() => patch({ foldersOpen: !chrome.foldersOpen })}
          >
            {chrome.foldersOpen ? copy("hideFolders") : copy("showFolders")}
          </button>
        )}
        {overview ? null : (
          <div className="flex rounded-full bg-free p-1 ring-1 ring-line">
            <button type="button" aria-pressed={chrome.cards} className={`min-h-10 rounded-full px-3 text-sm ${chrome.cards ? "bg-paper text-ink" : "text-muted"}`} onClick={() => patch({ cards: true })}>
              {copy("cards")}
            </button>
            <button type="button" aria-pressed={!chrome.cards} className={`min-h-10 rounded-full px-3 text-sm ${!chrome.cards ? "bg-paper text-ink" : "text-muted"}`} onClick={() => patch({ cards: false })}>
              {copy("compact")}
            </button>
          </div>
        )}
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer px-2 text-muted">{copy("display")}</summary>
          <div className="flex flex-col gap-1 rounded-2xl bg-free p-3 ring-1 ring-line">
            <Toggle checked={chrome.hideArchived} label={copy("hideArchived")} onChange={(value) => patch({ hideArchived: value })} />
            <Toggle checked={chrome.hideLocal} label={copy("hideLocal")} onChange={(value) => patch({ hideLocal: value })} />
            <Toggle checked={chrome.hideEmpty} label={copy("hideEmpty")} onChange={(value) => patch({ hideEmpty: value })} />
          </div>
        </details>
      </div>
      {visible.length === 0 && doc.bookmarkFolders.length === 0 && !imported ? (
        <EmptyLibrary onAdd={() => setEditing(blank())} onImport={() => file.current?.click()} />
      ) : (
        <div className={`grid items-start gap-6 ${showPanel ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : ""}`}>
          {showPanel ? (
            <aside id="bookmark-folders" className="hidden max-h-[70vh] overflow-auto rounded-3xl bg-free/50 p-3 lg:block">
              <FolderPanel
                folders={doc.bookmarkFolders}
                placements={doc.bookmarkPlacements}
                bookmarks={visible}
                expanded={chrome.expanded}
                hideEmpty={chrome.hideEmpty}
                active={folderId}
                onToggle={toggleExpanded}
                onOpen={selectFolder}
                onUnsorted={() => chooseLoose("unsorted")}
                onDuplicates={() => chooseLoose("duplicates")}
                onCreate={() => {
                  const name = window.prompt(copy("newFolder"));
                  if (name) app.saveFolder(name, folderId);
                }}
              />
            </aside>
          ) : null}
          <div className="min-w-0 space-y-5">
            {imported && !searching ? (
              <div className="rounded-2xl bg-free px-5 py-5">
                <p className="type-heading">{copy("importedSummary", { count: imported.bookmarks })}</p>
                <p className="mt-1 text-muted">{copy("folderSummary", { count: imported.folders })}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 rounded-full bg-now px-4 text-paper" onClick={() => searchRef.current?.focus()}>{copy("searchReferences")}</button>
                  <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" onClick={() => patch({ foldersOpen: true })}>{copy("browseFolders")}</button>
                </div>
              </div>
            ) : null}
            {searching ? (
              hits.length ? (
                <BookmarkList
                  cards={chrome.cards}
                  bookmarks={hits}
                  cursor={cursor}
                  menuId={menuId}
                  showBadge
                  pathFor={pathFor}
                  tintFor={tintFor}
                  folderIdFor={(id) => placementFor(id, doc.bookmarkPlacements, doc.bookmarkFolders, folderId)}
                  contextFor={(id) => contextLabels(doc, id)}
                  folders={doc.bookmarkFolders}
                  onPeek={setPeekId}
                  onMenu={setMenuId}
                  onPin={(bookmark) => app.editBookmark(bookmark.id, { pinned: !bookmark.pinned })}
                  onEdit={setEditing}
                  onArchive={(bookmark) => app.editBookmark(bookmark.id, { archived: !bookmark.archived })}
                  onDelete={(bookmark) => {
                    if (window.confirm(`${copy("deleteAsk")}\n${copy("deleteBody")}`)) {
                      app.removeBookmark(bookmark.id);
                      setPeekId(null);
                      setMenuId(null);
                    }
                  }}
                />
              ) : (
                <p className="text-muted">{copy("noMatches")}</p>
              )
            ) : null}
            {!searching && filter === "all" && !folderId && chrome.showAll ? (
              <button type="button" className="min-h-11 text-base font-medium" onClick={() => patch({ showAll: false })}>
                ‹ {copy("allFolders")}
              </button>
            ) : null}
            {!searching && activeFolder && filter === "all" ? (
              <FolderHeader
                folder={activeFolder}
                folders={doc.bookmarkFolders}
                count={inFolder.length}
                onOpen={selectFolder}
              />
            ) : null}
            {!searching && overview ? (
              <div>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="type-heading">{copy("folders")}</h2>
                  <button
                    type="button"
                    className="min-h-11 rounded-full px-4 text-sm ring-1 ring-line"
                    aria-expanded={chrome.foldersOpen}
                    aria-controls="bookmark-folders"
                    onClick={() => patch({ foldersOpen: !chrome.foldersOpen })}
                  >
                    {chrome.foldersOpen ? copy("hideFolders") : copy("showFolders")}
                  </button>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {roots.map((folder) => {
                    const count = bookmarksInTree(visible, doc.bookmarkFolders, doc.bookmarkPlacements, folder.id).length;
                    if (chrome.hideEmpty && count === 0) return null;
                    return (
                      <li key={folder.id}>
                        <FolderTile
                          folder={folder}
                          folders={doc.bookmarkFolders}
                          placements={doc.bookmarkPlacements}
                          bookmarks={visible}
                          onOpen={selectFolder}
                        />
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="mt-5 min-h-12 text-base text-now" aria-expanded={chrome.showAll} onClick={() => patch({ showAll: true })}>
                  {copy("showAll", { count: visible.length })}
                </button>
              </div>
            ) : null}
            {!searching && !overview && listed.length ? (
              <BookmarkList
                cards={chrome.cards}
                bookmarks={listed}
                menuId={menuId}
                pathFor={pathFor}
                tintFor={tintFor}
                folderIdFor={(id) => placementFor(id, doc.bookmarkPlacements, doc.bookmarkFolders, folderId)}
                contextFor={(id) => contextLabels(doc, id)}
                folders={doc.bookmarkFolders}
                onPeek={setPeekId}
                onMenu={setMenuId}
                onPin={(bookmark) => app.editBookmark(bookmark.id, { pinned: !bookmark.pinned })}
                onEdit={setEditing}
                onArchive={(bookmark) => app.editBookmark(bookmark.id, { archived: !bookmark.archived })}
                onDelete={(bookmark) => {
                  if (window.confirm(`${copy("deleteAsk")}\n${copy("deleteBody")}`)) {
                    app.removeBookmark(bookmark.id);
                    setPeekId(null);
                    setMenuId(null);
                  }
                }}
              />
            ) : null}
          </div>
        </div>
      )}
      {sheet ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label={copy("hideFolders")} onClick={() => setSheet(false)} />
          <div id="bookmark-folders-sheet" className="absolute inset-y-0 start-0 w-[min(22rem,88vw)] overflow-auto bg-paper p-4 shadow-lg">
            <FolderPanel
              folders={doc.bookmarkFolders}
              placements={doc.bookmarkPlacements}
              bookmarks={visible}
              expanded={chrome.expanded}
              hideEmpty={chrome.hideEmpty}
              active={folderId}
              onToggle={toggleExpanded}
              onOpen={selectFolder}
              onUnsorted={() => chooseLoose("unsorted")}
              onDuplicates={() => chooseLoose("duplicates")}
              onCreate={() => {
                const name = window.prompt(copy("newFolder"));
                if (name) app.saveFolder(name, folderId);
              }}
            />
          </div>
        </div>
      ) : null}
      {peek ? (
        <Peek
          bookmark={peek}
          path={pathFor(peek.id)}
          labels={contextLabels(doc, peek.id)}
          onClose={() => setPeekId(null)}
          onEdit={() => setEditing(peek)}
          onPin={() => app.editBookmark(peek.id, { pinned: !peek.pinned })}
          onArchive={() => app.editBookmark(peek.id, { archived: !peek.archived })}
          onDelete={() => {
            if (window.confirm(`${copy("deleteAsk")}\n${copy("deleteBody")}`)) {
              app.removeBookmark(peek.id);
              setPeekId(null);
            }
          }}
        />
      ) : null}
      <input ref={file} type="file" accept=".html,text/html" className="hidden" onChange={(event) => void loadFile(event, setPreview, setSelected)} />
      <button type="button" className="text-sm text-muted" onClick={() => file.current?.click()}>{copy("importBrowser")}</button>
      {editing ? (
        <BookmarkForm
          bookmark={editing}
          folders={doc.bookmarkFolders}
          bookmarks={doc.bookmarks}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing.id) app.editBookmark(editing.id, { title: input.title, url: input.url, note: input.note, tags: input.tags, pinned: input.pinned }, input.folderId);
            else app.saveBookmark(input);
            setEditing(null);
          }}
          onOpenExisting={(id) => setEditing(doc.bookmarks.find((item) => item.id === id) ?? null)}
          onAddFolder={(id, nextFolder) => {
            app.moveBookmark(id, null, nextFolder);
            setEditing(null);
          }}
        />
      ) : null}
      {preview ? (
        <ImportPreview
          preview={preview}
          selected={selected}
          onToggle={(id) => setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))}
          onClose={() => setPreview(null)}
          onAccept={() => {
            app.acceptImport(preview, selected);
            setImported({ bookmarks: preview.bookmarkCount, folders: preview.folderCount });
            setPreview(null);
            patch({ showAll: false, selectedFolder: null });
          }}
        />
      ) : null}
    </section>
  );
}

function chip(on: boolean) {
  return `min-h-11 rounded-full px-4 text-sm ${on ? "bg-ink font-semibold text-paper" : "bg-free text-ink ring-1 ring-line"}`;
}

function onSearchKey(
  event: ReactKeyboardEvent<HTMLInputElement>,
  hits: Bookmark[],
  cursor: number,
  setCursor: (value: number) => void,
  setPeekId: (id: string) => void,
  setQuery: (value: string) => void,
) {
  if (event.key === "Escape") {
    setQuery("");
    return;
  }
  if (!hits.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setCursor(Math.min(hits.length - 1, cursor + 1));
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    setCursor(Math.max(0, cursor - 1));
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const hit = hits[cursor];
    if (hit) setPeekId(hit.id);
  }
}

function FolderHeader({
  folder,
  folders,
  count,
  onOpen,
}: {
  folder: BookmarkFolder;
  folders: BookmarkFolder[];
  count: number;
  onOpen: (id: string | null) => void;
}) {
  const copy = useTranslations("app.bookmarks");
  const chain = ancestorIds(folders, folder.id)
    .map((id) => folders.find((item) => item.id === id))
    .filter((item): item is BookmarkFolder => Boolean(item));
  const children = folders.filter((item) => item.parentId === folder.id);
  const accent = folderAccent(folders, folder.id);
  return (
    <header className="space-y-3 rounded-3xl p-5" style={surface(accent, 10, 22)}>
      <nav className="flex flex-wrap items-center gap-x-2 text-sm">
        <button type="button" className="min-h-11 font-medium" onClick={() => onOpen(null)}>
          ‹ {copy("allFolders")}
        </button>
        {chain.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-2">
            <span aria-hidden>›</span>
            <button type="button" className={`min-h-11 ${item.id === folder.id ? "font-semibold" : ""}`} onClick={() => onOpen(item.id)}>
              {item.name}
            </button>
          </span>
        ))}
      </nav>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">{folder.name}</h2>
        <p className="mt-1 text-base text-muted">{copy("linkCount", { count })}</p>
      </div>
      {children.length ? (
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          {children.map((child, index) => (
            <span key={child.id} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden>·</span> : null}
              <button type="button" className="min-h-11 font-medium" onClick={() => onOpen(child.id)}>
                {child.name}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </header>
  );
}

function FolderTile({
  folder,
  folders,
  placements,
  bookmarks,
  onOpen,
}: {
  folder: BookmarkFolder;
  folders: BookmarkFolder[];
  placements: BookmarkFolderPlacement[];
  bookmarks: Bookmark[];
  onOpen: (id: string) => void;
}) {
  const children = folders
    .filter((item) => item.parentId === folder.id)
    .map((child) => ({
      folder: child,
      count: bookmarksInTree(bookmarks, folders, placements, child.id).length,
    }))
    .filter((child) => child.count > 0)
    .slice(0, 3);
  const domains = representativeDomains(bookmarksInTree(bookmarks, folders, placements, folder.id));
  const accent = folderAccent(folders, folder.id);
  const total = bookmarksInTree(bookmarks, folders, placements, folder.id).length;
  return (
    <article className="flex h-full min-h-40 flex-col rounded-3xl p-5 text-left" style={surface(accent, 10, 22)}>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => onOpen(folder.id)}>
        <span className="text-xl font-semibold">{folder.name}</span>
        <span className="text-lg tabular-nums">{total}</span>
      </button>
      {children.length ? (
        <ul className="mt-4 space-y-1">
          {children.map((child) => (
            <li key={child.folder.id}>
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-sm text-ink/80" onClick={() => onOpen(child.folder.id)}>
                <span>{child.folder.name}</span>
                <span className="tabular-nums text-muted">{child.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {domains.length ? <p className="mt-auto pt-4 text-sm text-muted">{domains.join(" · ")}</p> : null}
    </article>
  );
}

function BookmarkList({
  cards,
  bookmarks,
  cursor = -1,
  menuId,
  showBadge = false,
  pathFor,
  tintFor,
  folderIdFor,
  contextFor,
  folders,
  onPeek,
  onMenu,
  onPin,
  onEdit,
  onArchive,
  onDelete,
}: {
  cards: boolean;
  bookmarks: Bookmark[];
  cursor?: number;
  menuId: string | null;
  showBadge?: boolean;
  pathFor: (id: string) => string[];
  tintFor: (id: string) => FolderAccent | null;
  folderIdFor: (id: string) => string | null;
  contextFor: (id: string) => string[];
  folders: BookmarkFolder[];
  onPeek: (id: string) => void;
  onMenu: (id: string | null) => void;
  onPin: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onArchive: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}) {
  const copy = useTranslations("app.bookmarks");
  if (!bookmarks.length) return null;
  if (!cards) {
    return (
      <ul className="space-y-1">
        {bookmarks.map((bookmark, index) => {
          const accent = tintFor(bookmark.id);
          const path = pathFor(bookmark.id);
          const { name: rootName, accent: rootAccent } = rootBadge(bookmark.id, folders, folderIdFor);
          return (
            <li key={bookmark.id} className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 ${cursor === index ? "ring-2 ring-now" : ""}`} style={accent ? surface(accent, 8, 18) : undefined}>
              <DomainMark domain={bookmark.domain} accent={accent} />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onPeek(bookmark.id)}>
                <span className="block truncate text-base font-medium">{bookmark.title}</span>
                <span className="block truncate text-sm text-muted">
                  {bookmark.domain || copy("localFile")}
                  {path.length ? ` · ${path.join(" › ")}` : ""}
                </span>
                {showBadge && rootName ? <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-ink" style={rootAccent ? { background: accentMix(rootAccent, 22) } : undefined}>{rootName}</span> : null}
              </button>
              <RowActions
                bookmark={bookmark}
                openMenu={menuId === bookmark.id}
                onMenu={() => onMenu(menuId === bookmark.id ? null : bookmark.id)}
                onPin={() => onPin(bookmark)}
                onEdit={() => onEdit(bookmark)}
                onArchive={() => onArchive(bookmark)}
                onDelete={() => onDelete(bookmark)}
              />
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {bookmarks.map((bookmark, index) => {
        const accent = tintFor(bookmark.id);
        const path = pathFor(bookmark.id);
        const labels = contextFor(bookmark.id);
        const { name: rootName, accent: rootAccent } = rootBadge(bookmark.id, folders, folderIdFor);
        return (
          <li key={bookmark.id} className={`flex h-full flex-col rounded-3xl p-4 ${cursor === index ? "ring-2 ring-now" : ""}`} style={accent ? surface(accent, 8, 20) : { background: "color-mix(in srgb, var(--free) 70%, var(--paper))" }}>
            <div className="flex items-start justify-between gap-2">
              <DomainMark domain={bookmark.domain} accent={accent} />
              <RowActions
                bookmark={bookmark}
                openMenu={menuId === bookmark.id}
                onMenu={() => onMenu(menuId === bookmark.id ? null : bookmark.id)}
                onPin={() => onPin(bookmark)}
                onEdit={() => onEdit(bookmark)}
                onArchive={() => onArchive(bookmark)}
                onDelete={() => onDelete(bookmark)}
              />
            </div>
            <button type="button" className="mt-4 text-left" onClick={() => onPeek(bookmark.id)}>
              <span className="block text-lg font-medium leading-snug">{bookmark.title}</span>
              <span className="mt-1 block text-sm text-muted">{bookmark.domain || copy("localFile")}</span>
            </button>
            {showBadge && rootName && rootAccent ? (
              <span className="mt-3 inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold text-ink" style={{ background: accentMix(rootAccent, 22) }}>
                {rootName}
              </span>
            ) : null}
            {path.length ? <p className="mt-3 text-sm text-ink/75">{path.join(" › ")}</p> : null}
            {labels[0] ? <p className="mt-3 text-sm">{copy("attachedTo")}: {labels[0]}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function RowActions({
  bookmark,
  openMenu,
  onMenu,
  onPin,
  onEdit,
  onArchive,
  onDelete,
}: {
  bookmark: Bookmark;
  openMenu: boolean;
  onMenu: () => void;
  onPin: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const copy = useTranslations("app.bookmarks");
  return (
    <div className="relative flex shrink-0 items-center gap-1">
      {bookmark.isLocalFile ? null : (
        <a href={bookmark.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-now">
          {copy("open")}
        </a>
      )}
      <BookmarkShare bookmark={bookmark} />
      <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg" aria-expanded={openMenu} aria-label={copy("moreActions")} onClick={onMenu}>
        ···
      </button>
      {openMenu ? (
        <div className="absolute end-0 top-12 z-20 min-w-36 rounded-2xl bg-paper p-2 shadow-lg ring-1 ring-line">
          <button type="button" className="block min-h-11 w-full px-3 text-left text-sm" onClick={onPin}>{bookmark.pinned ? copy("unpin") : copy("pin")}</button>
          <button type="button" className="block min-h-11 w-full px-3 text-left text-sm" onClick={onEdit}>{copy("edit")}</button>
          <button type="button" className="block min-h-11 w-full px-3 text-left text-sm" onClick={onArchive}>{copy("archive")}</button>
          <button type="button" className="block min-h-11 w-full px-3 text-left text-sm" onClick={onDelete}>{copy("deleteAsk")}</button>
        </div>
      ) : null}
    </div>
  );
}

function BookmarkShare({ bookmark }: { bookmark: Bookmark }) {
  const payload = bookmarkSharePayload(bookmark);
  if (!payload) return null;
  return <ShareButton payload={payload} />;
}

function DomainMark({ domain, accent }: { domain: string; accent: FolderAccent | null }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold tracking-wide text-ink"
      style={accent ? { background: accentMix(accent, 28), boxShadow: `inset 0 0 0 1px ${accentMix(accent, 45)}` } : { background: "var(--paper)", boxShadow: "inset 0 0 0 1px var(--line)" }}
    >
      {domainMark(domain)}
    </span>
  );
}

export function domainMark(domain: string) {
  const word = domain.replace(/^www\./, "").split(".")[0]?.replace(/[^a-z]/gi, "") ?? "";
  return (word.slice(0, 2) || "RF").toUpperCase();
}

function rootBadge(bookmarkId: string, folders: BookmarkFolder[], folderIdFor: (id: string) => string | null) {
  const leaf = folderIdFor(bookmarkId);
  if (!leaf) return { name: "", accent: null as FolderAccent | null };
  const rootId = ancestorIds(folders, leaf)[0];
  const root = rootId ? folders.find((folder) => folder.id === rootId) : undefined;
  return { name: root?.name ?? "", accent: rootId ? folderAccent(folders, rootId) : null };
}

function surface(accent: FolderAccent, fill: number, edge: number) {
  return {
    background: accentMix(accent, fill),
    boxShadow: `inset 4px 0 0 ${accentColor(accent)}, inset 0 0 0 1px ${accentMix(accent, edge)}`,
  };
}

function Peek({
  bookmark,
  path,
  labels,
  onClose,
  onEdit,
  onPin,
  onArchive,
  onDelete,
}: {
  bookmark: Bookmark;
  path: string[];
  labels: string[];
  onClose: () => void;
  onEdit: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const copy = useTranslations("app.bookmarks");
  const [menu, setMenu] = useState(false);
  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 rounded-3xl bg-paper p-5 shadow-lg ring-1 ring-line sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-[28rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{bookmark.title}</h2>
          <p className="mt-1 break-all text-sm text-muted">{bookmark.url}</p>
        </div>
        {bookmark.isLocalFile ? null : (
          <a href={bookmark.url} target="_blank" rel="noreferrer" className="text-xl text-now" aria-label={copy("open")}>↗</a>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">{path.join(" › ")}</p>
      {bookmark.note ? <p className="mt-4 text-base">{bookmark.note}</p> : null}
      {bookmark.isLocalFile ? <p className="mt-3 text-sm text-muted">{copy("localFile")}. {copy("localHint")}</p> : null}
      {labels.length ? (
        <p className="mt-4 text-sm"><span className="text-muted">{copy("attachedTo")}</span> {labels.join(", ")}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {bookmark.isLocalFile ? null : <a href={bookmark.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-now px-4 text-paper">{copy("open")}</a>}
        <BookmarkShare bookmark={bookmark} />
        <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" onClick={onEdit}>{copy("edit")}</button>
        <button type="button" className="min-h-11 rounded-full px-4 ring-1 ring-line" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>{copy("moreActions")}</button>
      </div>
      {menu ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button type="button" className="min-h-11" onClick={onPin}>{bookmark.pinned ? copy("unpin") : copy("pin")}</button>
          <button type="button" className="min-h-11" onClick={onArchive}>{copy("archive")}</button>
          <button type="button" className="min-h-11" onClick={onDelete}>{copy("deleteAsk")}</button>
        </div>
      ) : null}
      <button type="button" className="mt-4 text-sm text-muted" onClick={onClose}>{copy("cancel")}</button>
    </aside>
  );
}

function FolderPanel({
  folders,
  placements,
  bookmarks,
  expanded,
  hideEmpty,
  active,
  onToggle,
  onOpen,
  onUnsorted,
  onDuplicates,
  onCreate,
}: {
  folders: BookmarkFolder[];
  placements: BookmarkFolderPlacement[];
  bookmarks: Bookmark[];
  expanded: string[];
  hideEmpty: boolean;
  active: string | null;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onUnsorted: () => void;
  onDuplicates: () => void;
  onCreate: () => void;
}) {
  const copy = useTranslations("app.bookmarks");
  return (
    <div>
      <h2 className="type-heading px-2">{copy("folders")}</h2>
      <FolderTree
        folders={folders}
        placements={placements}
        bookmarks={bookmarks}
        parentId={null}
        expanded={expanded}
        hideEmpty={hideEmpty}
        active={active}
        onToggle={onToggle}
        onOpen={onOpen}
      />
      <div className="mt-4 space-y-1 px-2">
        <button type="button" className="block min-h-11 text-sm text-muted" onClick={onUnsorted}>{copy("unsorted")}</button>
        <button type="button" className="block min-h-11 text-sm text-muted" onClick={onDuplicates}>{copy("duplicates")}</button>
        <button type="button" className="block min-h-11 text-sm" onClick={onCreate}>+ {copy("newFolder")}</button>
      </div>
    </div>
  );
}

function FolderTree({
  folders,
  placements,
  bookmarks,
  parentId,
  expanded,
  hideEmpty,
  active,
  onToggle,
  onOpen,
}: {
  folders: BookmarkFolder[];
  placements: BookmarkFolderPlacement[];
  bookmarks: Bookmark[];
  parentId: string | null;
  expanded: string[];
  hideEmpty: boolean;
  active: string | null;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const rows = folders.filter((folder) => folder.parentId === parentId);
  return (
    <ul className={parentId ? "ms-3" : "mt-2 space-y-1"}>
      {rows.map((folder) => {
        const count = bookmarksInTree(bookmarks, folders, placements, folder.id).length;
        if (hideEmpty && count === 0) return null;
        const open = expanded.includes(folder.id);
        const accent = folderAccent(folders, folder.id);
        const selected = active === folder.id;
        return (
          <li key={folder.id}>
            <div
              className="flex min-h-11 items-center gap-1 rounded-xl px-1"
              style={selected ? { background: accentMix(accent, 16), boxShadow: `inset 3px 0 0 ${accentColor(accent)}` } : undefined}
            >
              <button type="button" aria-expanded={open} className="inline-flex h-11 w-8 items-center justify-center text-muted" onClick={() => onToggle(folder.id)}>
                {open ? "▾" : "▸"}
              </button>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                className={`flex min-h-11 flex-1 items-center justify-between gap-2 text-left text-base ${selected ? "font-semibold" : ""}`}
                onClick={() => {
                  onOpen(folder.id);
                  if (!open) onToggle(folder.id);
                }}
              >
                <span className="truncate">{folder.name}</span>
                <span className="text-sm tabular-nums text-muted">{count}</span>
              </button>
            </div>
            {open ? (
              <FolderTree folders={folders} placements={placements} bookmarks={bookmarks} parentId={folder.id} expanded={expanded} hideEmpty={hideEmpty} active={active} onToggle={onToggle} onOpen={onOpen} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyLibrary({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  const copy = useTranslations("app.bookmarks");
  return (
    <div className="rounded-3xl bg-free px-6 py-10">
      <p className="max-w-md text-lg">{copy("emptyLead")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="min-h-12 rounded-full bg-now px-5 text-paper" onClick={onAdd}>+ {copy("addBookmark")}</button>
        <button type="button" className="min-h-12 rounded-full px-5 ring-1 ring-line" onClick={onImport}>{copy("importBrowser")}</button>
      </div>
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function applyFilter(filter: string, bookmarks: Bookmark[], doc: StoreDocument) {
  const scoped = { ...doc, bookmarks };
  if (filter === "pinned") return getPinnedBookmarks(scoped);
  if (filter === "recent") return getRecentBookmarks(scoped);
  if (filter === "attached") return getAttachedBookmarks(scoped);
  if (filter === "local") return getLocalFileBookmarks(scoped);
  if (filter === "unsorted") return getUnsortedBookmarks(scoped);
  if (filter === "duplicates") return getDuplicateCandidates(scoped).flat();
  return bookmarks;
}

function contextLabels(doc: StoreDocument, bookmarkId: string) {
  return doc.bookmarkAttachments
    .filter((link) => link.bookmarkId === bookmarkId)
    .map((link) =>
      link.target.kind === "project"
        ? doc.projects.find((project) => project.id === link.target.id)?.name
        : doc.items.find((item) => item.id === link.target.id)?.title,
    )
    .filter((title): title is string => Boolean(title));
}

function placedPath(bookmarkId: string, folders: BookmarkFolder[], placements: BookmarkFolderPlacement[]) {
  const place = placements.find((item) => item.bookmarkId === bookmarkId);
  return place ? folderPath(folders, place.folderId) : [];
}

function placementFor(bookmarkId: string, placements: BookmarkFolderPlacement[], folders: BookmarkFolder[], activeFolderId: string | null) {
  const places = placements.filter((item) => item.bookmarkId === bookmarkId);
  if (activeFolderId) {
    const ids = descendantIds(folders, activeFolderId);
    const inside = places.find((item) => ids.has(item.folderId));
    if (inside) return inside.folderId;
  }
  return places[0]?.folderId ?? null;
}

function ancestorIds(folders: BookmarkFolder[], folderId: string) {
  const ids: string[] = [];
  let current: string | null = folderId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    ids.unshift(current);
    current = folders.find((folder) => folder.id === current)?.parentId ?? null;
  }
  return ids;
}

function descendantIds(folders: BookmarkFolder[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

function bookmarksInTree(bookmarks: Bookmark[], folders: BookmarkFolder[], placements: BookmarkFolderPlacement[], folderId: string) {
  const ids = descendantIds(folders, folderId);
  const chosen = new Set(placements.filter((place) => ids.has(place.folderId)).map((place) => place.bookmarkId));
  return bookmarks.filter((bookmark) => chosen.has(bookmark.id));
}

function representativeDomains(bookmarks: Bookmark[]) {
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const bookmark of bookmarks) {
    if (!bookmark.domain || seen.has(bookmark.domain)) continue;
    seen.add(bookmark.domain);
    domains.push(bookmark.domain);
    if (domains.length === 3) break;
  }
  return domains;
}

function blank(): Bookmark {
  return {
    id: "",
    title: "",
    url: "",
    normalizedUrl: "",
    domain: "",
    tags: [],
    pinned: false,
    archived: false,
    source: { kind: "dayline" },
    createdAt: 0,
    updatedAt: 0,
    isLocalFile: false,
  };
}

function BookmarkForm({
  bookmark,
  folders,
  bookmarks,
  onClose,
  onSave,
  onOpenExisting,
  onAddFolder,
}: {
  bookmark: Bookmark;
  folders: BookmarkFolder[];
  bookmarks: Bookmark[];
  onClose: () => void;
  onSave: (input: { title: string; url: string; note?: string; tags: string[]; folderId: string | null; pinned: boolean }) => void;
  onOpenExisting: (id: string) => void;
  onAddFolder: (id: string, folderId: string | null) => void;
}) {
  const copy = useTranslations("app.bookmarks");
  const [url, setUrl] = useState(bookmark.url);
  const [title, setTitle] = useState(bookmark.title);
  const [note, setNote] = useState(bookmark.note ?? "");
  const [tags, setTags] = useState(bookmark.tags.join(", "));
  const [folderId, setFolderId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(bookmark.pinned);
  const duplicate = findBookmarkByUrl({ bookmarks } as StoreDocument, url);
  const duplicateId = duplicate && duplicate.id !== bookmark.id ? duplicate.id : null;
  return (
    <form className="space-y-3 rounded-3xl bg-free p-5" onSubmit={(event) => {
      event.preventDefault();
      onSave({ title, url, note, tags: tags.split(",").map((item) => item.trim()).filter(Boolean), folderId, pinned });
    }}>
      <label className="block text-sm">{copy("url")}<input required value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl bg-paper px-3 ring-1 ring-line" /></label>
      <label className="block text-sm">{copy("name")}<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl bg-paper px-3 ring-1 ring-line" /></label>
      <label className="block text-sm">{copy("folder")}
        <select value={folderId ?? ""} onChange={(event) => setFolderId(event.target.value || null)} className="mt-1 min-h-12 w-full rounded-2xl bg-paper px-3 ring-1 ring-line">
          <option value="">{copy("unsorted")}</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">{copy("tags")}<input value={tags} onChange={(event) => setTags(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl bg-paper px-3 ring-1 ring-line" /></label>
      <label className="block text-sm">{copy("note")}<textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl bg-paper px-3 py-2 ring-1 ring-line" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />{copy("pin")}</label>
      {duplicateId ? (
        <div className="space-y-2 text-sm">
          <p>{copy("exists")}</p>
          <button type="button" className="min-h-11" onClick={() => onOpenExisting(duplicateId)}>{copy("openExisting")}</button>
          <button type="button" className="min-h-11" onClick={() => onAddFolder(duplicateId, folderId)}>{copy("addToFolder")}</button>
        </div>
      ) : <button type="submit" className="min-h-12 rounded-full bg-now px-5 text-paper">{copy("save")}</button>}
      <button type="button" className="ms-3 text-sm" onClick={onClose}>{copy("cancel")}</button>
    </form>
  );
}

function ImportPreview({
  preview,
  selected,
  onToggle,
  onClose,
  onAccept,
}: {
  preview: NetscapePreview;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onAccept: () => void;
}) {
  const copy = useTranslations("app.bookmarks");
  return (
    <div className="space-y-3 rounded-3xl bg-free p-5">
      <h2 className="type-heading">{copy("importTitle")}</h2>
      <p className="text-sm text-muted">{copy("importFound", { bookmarks: preview.bookmarkCount, folders: preview.folderCount, duplicates: preview.duplicateCount, local: preview.localFileCount })}</p>
      <ul>
        {preview.folders.filter((folder) => !folder.parentId).map((folder) => (
          <FolderChecks key={folder.id} folder={folder} folders={preview.folders} selected={selected} onToggle={onToggle} />
        ))}
      </ul>
      <button type="button" className="min-h-12 rounded-full bg-now px-5 text-paper" onClick={onAccept}>{copy("importAccept")}</button>
      <button type="button" className="ms-3 text-sm" onClick={onClose}>{copy("cancel")}</button>
    </div>
  );
}

function FolderChecks({ folder, folders, selected, onToggle }: { folder: BookmarkFolder; folders: BookmarkFolder[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <li className="ms-3">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={selected.includes(folder.id)} onChange={() => onToggle(folder.id)} />
        {folder.name}
      </label>
      <ul>
        {folders.filter((item) => item.parentId === folder.id).map((child) => (
          <FolderChecks key={child.id} folder={child} folders={folders} selected={selected} onToggle={onToggle} />
        ))}
      </ul>
    </li>
  );
}

async function loadFile(event: ChangeEvent<HTMLInputElement>, setPreview: (preview: NetscapePreview) => void, setSelected: (ids: string[]) => void) {
  const chosen = event.target.files?.[0];
  if (!chosen) return;
  const preview = importNetscapeBookmarks(await chosen.text());
  setPreview(preview);
  setSelected(preview.folders.map((folder) => folder.id));
}

export function BookmarkPicker({ target }: { target: { kind: "task" | "project" | "note"; id: string } }) {
  const app = useDayline();
  const copy = useTranslations("app.bookmarks");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const attached = app.doc.bookmarkAttachments.filter((item) => item.target.kind === target.kind && item.target.id === target.id);
  const hits = searchBookmarks(query, app.doc.bookmarks, app.doc.bookmarkFolders, app.doc.bookmarkPlacements);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{copy("references")}</p>
      <ul className="space-y-1">
        {attached.map((link) => {
          const bookmark = app.doc.bookmarks.find((item) => item.id === link.bookmarkId);
          if (!bookmark) return null;
          return (
            <li key={link.id} className="flex min-h-11 items-center justify-between gap-2 text-sm">
              <span className="truncate">{bookmark.title}<span className="ms-2 text-muted">{bookmark.domain}</span></span>
              <button type="button" onClick={() => app.detachBookmark(link.id)} aria-label={copy("cancel")}>×</button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="min-h-11 text-sm text-now" aria-expanded={open} onClick={() => setOpen((value) => !value)}>+ {copy("attach")}</button>
      {open ? (
        <div className="space-y-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("find")} className="min-h-12 w-full rounded-2xl bg-free px-3 text-sm ring-1 ring-line" />
          <ul>
            {hits.slice(0, 8).map((hit) => (
              <li key={hit.bookmark.id}>
                <button type="button" className="min-h-11 text-sm" onClick={() => app.attachBookmark(hit.bookmark.id, target)}>{hit.bookmark.title}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TaskReferences({ taskId }: { taskId: string }) {
  const app = useDayline();
  const copy = useTranslations("app.bookmarks");
  const links = attachmentsFor(app.doc, "task", taskId);
  if (!links.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted">{copy("references")} · {links.length}</p>
      <ul>
        {links.map((bookmark) => (
          <li key={bookmark.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span className="truncate">{bookmark.title}</span>
            {bookmark.isLocalFile ? <span className="text-muted">{copy("localFile")}</span> : (
              <a href={bookmark.url} target="_blank" rel="noreferrer" className="text-now" aria-label={copy("open")}>↗</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

