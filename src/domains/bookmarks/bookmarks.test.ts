import { describe, expect, it } from "vitest";
import { occurrencesOnDay } from "@/domains/planning/day-view";
import {
  attachmentsFor,
  attachBookmark,
  createBookmark,
  createFolder,
  deleteBookmark,
  deleteFolder,
  detachBookmark,
  findBookmarkByUrl,
  getDuplicateCandidates,
  getLocalFileBookmarks,
  getPinnedBookmarks,
  getUnsortedBookmarks,
  importBookmarkSeed,
  moveBookmark,
  renameFolder,
  searchBookmarks,
  updateBookmark,
  urlSaveAs,
} from "@/domains/bookmarks/bookmarks";
import { acceptBookmarkImport, importNetscapeBookmarks } from "@/domains/bookmarks/netscape";
import { emptyStore, parseStore } from "@/lib/store/repository";
import type { StoreDocument } from "@/lib/types";

const HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><A HREF="https://WWW.GitHub.com/rails" ICON="data:image/png;base64,AAAA">Ruby on Rails</A>
    <DT><H3>Daily</H3>
    <DL><p>
      <DT><A HREF="https://github.com/rails/" ADD_DATE="10">Rails again</A>
      <DT><A HREF="file:///Users/me/notes.pdf">Grammar PDF</A>
    </DL>
  </DL>
</DL>`;

function doc(): StoreDocument {
  return emptyStore();
}

describe("bookmarks", () => {
  it("creates, edits, pins, archives, and deletes a bookmark", () => {
    const created = createBookmark(doc(), { title: "Rails", url: "https://rubyonrails.org", tags: ["ruby"], note: "docs" });
    expect(created?.created).toBe(true);
    const id = created!.bookmark.id;
    const pinned = updateBookmark(created!.doc, id, { pinned: true, title: "Rails home" });
    expect(getPinnedBookmarks(pinned)[0]?.title).toBe("Rails home");
    const archived = updateBookmark(pinned, id, { pinned: false, archived: true });
    expect(archived.bookmarks[0]?.archived).toBe(true);
    expect(getPinnedBookmarks(archived)).toEqual([]);
    const removed = deleteBookmark(archived, id);
    expect(removed.bookmarks).toEqual([]);
  });

  it("nests, renames, and moves folders without dropping a shared bookmark", () => {
    let store = createFolder(doc(), "Work");
    const work = store.bookmarkFolders[0]!.id;
    store = createFolder(store, "German", work);
    const german = store.bookmarkFolders[1]!.id;
    store = renameFolder(store, german, "Deutsch");
    expect(store.bookmarkFolders.find((folder) => folder.id === german)?.name).toBe("Deutsch");
    const saved = createBookmark(store, { title: "Board", url: "https://example.com/board", folderId: work });
    store = saved!.doc;
    store = placeIn(store, saved!.bookmark.id, german);
    store = moveBookmark(store, saved!.bookmark.id, work, null);
    store = deleteFolder(store, german);
    expect(store.bookmarks).toHaveLength(1);
    expect(getUnsortedBookmarks(store).map((item) => item.id)).toEqual([saved!.bookmark.id]);
  });

  it("searches title, domain, url, folder, tag, and note, and ranks an exact title first", () => {
    let store = createFolder(doc(), "Daily");
    const daily = store.bookmarkFolders[0]!.id;
    store = createFolder(store, "blogs", daily);
    const blogs = store.bookmarkFolders[1]!.id;
    const rails = createBookmark(store, {
      title: "Ruby on Rails",
      url: "https://rubyonrails.org/interview",
      tags: ["ruby"],
      note: "interview notes",
      folderId: blogs,
    });
    store = rails!.doc;
    const other = createBookmark(store, { title: "Git host", url: "https://github.com/rails-extra", folderId: daily });
    store = other!.doc;
    const hits = searchBookmarks("ruby interview", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements);
    expect(hits[0]?.bookmark.title).toBe("Ruby on Rails");
    expect(searchBookmarks("rubyonrails.org", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements)[0]?.reason).toBe(
      "domain",
    );
    expect(searchBookmarks("interview notes page", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements)).toEqual([]);
    expect(searchBookmarks("https://github.com/rails-extra", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements)[0]?.bookmark.id).toBe(
      other!.bookmark.id,
    );
    expect(searchBookmarks("daily blogs", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements).length).toBeGreaterThan(0);
    expect(searchBookmarks("ruby", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements).some((hit) => hit.reason === "tag" || hit.reason === "title")).toBe(true);
    expect(searchBookmarks("interview notes", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements)[0]?.reason).toBe("note");
  });

  it("merges the same normalized URL and keeps different URLs with the same title", () => {
    const first = createBookmark(doc(), { title: "Project board", url: "https://Example.com/app/" });
    const again = createBookmark(first!.doc, { title: "Other name", url: "https://example.com/app?fbclid=1" });
    expect(again?.created).toBe(false);
    expect(again?.doc.bookmarks).toHaveLength(1);
    const second = createBookmark(again!.doc, { title: "Project board", url: "https://example.com/other" });
    expect(second?.created).toBe(true);
    expect(findBookmarkByUrl(second!.doc, "https://example.com/app")?.id).toBe(first!.bookmark.id);
    expect(createBookmark(second!.doc, { title: "Anchor", url: "https://example.com/app#section" })?.created).toBe(true);
    const duped = {
      ...second!.doc,
      bookmarks: [...second!.doc.bookmarks, { ...second!.doc.bookmarks[0]!, id: "copy" }],
    };
    expect(getDuplicateCandidates(duped)).toHaveLength(1);
  });

  it("imports nested Netscape bookmarks, drops favicons, and waits for accept", () => {
    const before = doc();
    const preview = importNetscapeBookmarks(HTML);
    expect(preview.folderCount).toBeGreaterThan(1);
    expect(preview.bookmarks.some((item) => item.title.includes("Rails"))).toBe(true);
    expect(preview.localFileCount).toBe(1);
    expect(preview.bookmarks.find((item) => item.isLocalFile)?.url.startsWith("file:")).toBe(true);
    expect(HTML.includes("base64")).toBe(true);
    expect(JSON.stringify(preview).includes("base64")).toBe(false);
    expect(preview.duplicateCount).toBe(1);
    expect(before.bookmarks).toEqual([]);
    const accepted = acceptBookmarkImport(before, preview);
    expect(accepted.bookmarks.length).toBe(preview.bookmarkCount);
    expect(accepted.bookmarkFolders.length).toBe(preview.folderCount);
    expect(getLocalFileBookmarks(accepted)).toHaveLength(1);
  });

  it("attaches one bookmark to a task, project, and note, and deletes links without the bookmark until the bookmark goes", () => {
    const saved = createBookmark(doc(), { title: "Brief", url: "https://docs.google.com/brief" })!;
    let store = attachBookmark(saved.doc, saved.bookmark.id, { kind: "task", id: "task-1" });
    store = attachBookmark(store, saved.bookmark.id, { kind: "project", id: "project-1" });
    store = attachBookmark(store, saved.bookmark.id, { kind: "note", id: "note-1" });
    expect(store.bookmarkAttachments).toHaveLength(3);
    expect(attachmentsFor(store, "task", "task-1")).toHaveLength(1);
    expect(attachmentsFor(store, "project", "project-1")).toHaveLength(1);
    expect(attachmentsFor(store, "note", "note-1")).toHaveLength(1);
    const one = store.bookmarkAttachments[0]!;
    store = detachBookmark(store, one.id);
    expect(store.bookmarks).toHaveLength(1);
    expect(store.bookmarkAttachments).toHaveLength(2);
    expect(searchBookmarks("brief", store.bookmarks, store.bookmarkFolders, store.bookmarkPlacements)).toHaveLength(1);
    expect(urlSaveAs("https://docs.google.com/brief")).toEqual(["bookmark", "task", "note"]);
    expect(urlSaveAs("buy milk")).toBeNull();
    store = deleteBookmark(store, saved.bookmark.id);
    expect(store.bookmarkAttachments).toEqual([]);
    expect(occurrencesOnDay(store, new Date()).some((item) => item.id === saved.bookmark.id)).toBe(false);
  });

  it("keeps existing day data when bookmark fields are missing", () => {
    const legacy = {
      version: 1,
      items: [
        {
          id: "task-1",
          kind: "task",
          title: "Keep me",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
          projectId: null,
          areaId: null,
          tags: [],
          source: { kind: "local" },
          status: "inbox",
          estimatedMinutes: null,
          actualMinutes: 0,
          scheduledStart: null,
          scheduledEnd: null,
          deadline: null,
          deadlineKind: "none",
          priority: "normal",
          notes: "",
          parentTaskId: null,
          dependsOn: [],
          flexibility: "flexible",
          interruptible: true,
          sometime: false,
          waitingFor: null,
        },
      ],
      projects: [],
      sessions: [],
      workingHours: { startMinutes: 540, endMinutes: 1080, lunchStartMinutes: 750, lunchEndMinutes: 810 },
      undo: [],
      seeded: true,
    };
    const loaded = parseStore(JSON.stringify(legacy));
    expect(loaded.items[0]?.title).toBe("Keep me");
    expect(loaded.bookmarks).toEqual([]);
    const seeded = importBookmarkSeed(loaded, {
      folders: [{ id: "fld-1", name: "Daily", parentId: null }],
      bookmarks: [{ id: "bm-1", title: "Blog", url: "https://example.com/blog", folderIds: ["fld-1"] }],
    });
    expect(seeded.items[0]?.title).toBe("Keep me");
    expect(seeded.bookmarks).toHaveLength(1);
  });
});

function placeIn(store: StoreDocument, bookmarkId: string, folderId: string): StoreDocument {
  return {
    ...store,
    bookmarkPlacements: [...store.bookmarkPlacements, { bookmarkId, folderId }],
  };
}
