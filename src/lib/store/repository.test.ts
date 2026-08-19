import { describe, expect, it } from "vitest";
import { MemoryAdapter, Repository, emptyStore, parseStore } from "@/lib/store/repository";
import { STORE_VERSION } from "@/lib/types";

describe("repository", () => {
  it("round-trips a document", () => {
    const adapter = new MemoryAdapter();
    const repo = new Repository(adapter);
    const doc = emptyStore();
    repo.save(doc);
    expect(repo.load().version).toBe(STORE_VERSION);
  });

  it("returns empty store for corrupt json", () => {
    expect(parseStore("{not json")).toMatchObject({ items: [] });
  });
});
