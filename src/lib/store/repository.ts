import { STORE_VERSION, storeDocumentSchema, type StoreDocument } from "@/lib/types";

export const STORE_KEY = "dayline.local.v1";

export interface StoreAdapter {
  read(): string | null;
  write(raw: string): void;
}

export class MemoryAdapter implements StoreAdapter {
  private value: string | null = null;
  read() {
    return this.value;
  }
  write(raw: string) {
    this.value = raw;
  }
}

export class LocalStorageAdapter implements StoreAdapter {
  constructor(private readonly key = STORE_KEY) {}
  read() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(this.key);
  }
  write(raw: string) {
    window.localStorage.setItem(this.key, raw);
  }
}

export const DEFAULT_WORKING_HOURS = {
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
  lunchStartMinutes: 12 * 60 + 30,
  lunchEndMinutes: 13 * 60 + 30,
};

export function emptyStore(): StoreDocument {
  return {
    version: STORE_VERSION,
    items: [],
    projects: [],
    sessions: [],
    workingHours: DEFAULT_WORKING_HOURS,
    undo: [],
    seeded: false,
  };
}

export function parseStore(raw: string | null): StoreDocument {
  if (!raw) return emptyStore();
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = storeDocumentSchema.safeParse(parsed);
    if (!result.success) return emptyStore();
    return result.data;
  } catch {
    return emptyStore();
  }
}

export class Repository {
  constructor(private readonly adapter: StoreAdapter) {}

  load(): StoreDocument {
    return parseStore(this.adapter.read());
  }

  save(doc: StoreDocument): void {
    this.adapter.write(JSON.stringify(doc));
  }
}
