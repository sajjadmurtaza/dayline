import { describe, expect, it } from "vitest";
import type { BookmarkFolder } from "@/lib/types";
import { folderAccent } from "@/lib/bookmark-folder-accent";

function folder(id: string, name: string, parentId: string | null): BookmarkFolder {
  return { id, name, parentId, createdAt: 0, updatedAt: 0 };
}

const folders = [
  folder("dev", "Development", null),
  folder("ruby", "Ruby", "dev"),
  folder("rails", "Rails", "dev"),
  folder("tools", "Tools", "dev"),
  folder("study", "Study", null),
  folder("german", "German", "study"),
];

describe("folderAccent", () => {
  it("keeps the same accent for the same folder id", () => {
    expect(folderAccent(folders, "dev")).toEqual(folderAccent(folders, "dev"));
    expect(folderAccent(folders, "rails")).toEqual(folderAccent([...folders].reverse(), "rails"));
  });

  it("keeps children in the parent hue", () => {
    const parent = folderAccent(folders, "dev");
    for (const id of ["ruby", "rails", "tools"]) {
      const child = folderAccent(folders, id);
      expect(child.hue).toBe(parent.hue);
      expect(child.sat !== parent.sat || child.light !== parent.light).toBe(true);
    }
    const study = folderAccent(folders, "study");
    const german = folderAccent(folders, "german");
    expect(german.hue).toBe(study.hue);
    expect(german.hue === parent.hue && german.sat === parent.sat && german.light === parent.light).toBe(false);
  });
});
