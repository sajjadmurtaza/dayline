import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "./config";
import { loadMessages } from "./load-messages";

describe("loadMessages", () => {
  it("loads English app copy including Today attention strings", async () => {
    const messages = await loadMessages("en");
    const today = messages.app.today as Record<string, string>;
    expect(today.findAnotherTime).toBe("Find another time");
    expect(today.stillOpen).toBe("Still open");
  });

  it("loads every supported locale without dropping namespaces", async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const messages = await loadMessages(locale);
      expect(messages.common.appName).toBe("Dayline");
      expect(messages.app.today).toBeTruthy();
    }
  });
});
