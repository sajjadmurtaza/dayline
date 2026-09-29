import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/locales/en/app.json";
import { ShareButton } from "@/components/share/ShareButton";
import { copyShareLink, copyShareText, qrFileSharingSupported, shareNative } from "@/domains/share/shareService";
import { createQrCode, downloadQrCode } from "@/domains/share/qrService";
import {
  bookmarkSharePayload,
  calendarSharePayload,
  isShareableUrl,
  prepareShare,
  questionSharePayload,
  sanitizeQrFilename,
} from "@/domains/share/shareUrl";
import type { SharePayload } from "@/domains/share/types";

const messages = { app: en };

function nav(overrides: Partial<Pick<Navigator, "share" | "clipboard" | "canShare">> = {}) {
  return {
    share: vi.fn(async () => undefined),
    clipboard: { writeText: vi.fn(async () => undefined) },
    canShare: vi.fn(() => false),
    ...overrides,
  } as unknown as Pick<Navigator, "share" | "clipboard" | "canShare">;
}

describe("share domain", () => {
  it("accepts a generic payload", () => {
    const payload: SharePayload = {
      title: "Rails interview questions",
      text: "How does the query cache work?",
      url: "https://github.com/rails/rails",
      source: "bookmark",
      privacy: "external",
    };
    const prepared = prepareShare(payload);
    expect(prepared.title).toBe(payload.title);
    expect(prepared.url).toBe(payload.url);
    expect(prepared.qrValue).toBe(payload.url);
  });

  it("calls native share with title, text, and url", async () => {
    const browser = nav();
    const payload = { title: "Driving theory question", text: "Stop at a red light", url: "https://example.com/questions/123", source: "question" as const };
    await expect(shareNative(payload, browser)).resolves.toBe("shared");
    expect(browser.share).toHaveBeenCalledWith({ title: payload.title, text: payload.text, url: payload.url });
  });

  it("treats a cancelled native share as a quiet result", async () => {
    const abort = new Error("The user aborted a request.");
    abort.name = "AbortError";
    const browser = nav({ share: vi.fn(async () => { throw abort; }) });
    await expect(shareNative({ title: "Note" }, browser)).resolves.toBe("cancelled");
  });

  it("copies the public link and the text", async () => {
    const browser = nav();
    const payload = { title: "Bookmark", text: "Read later", url: "https://example.com/page" };
    await expect(copyShareLink(payload, browser)).resolves.toBe(true);
    await expect(copyShareText(payload, browser)).resolves.toBe(true);
    expect(browser.clipboard.writeText).toHaveBeenNthCalledWith(1, payload.url);
    expect(browser.clipboard.writeText).toHaveBeenNthCalledWith(2, payload.text);
  });

  it("builds a QR code from the public URL", async () => {
    const dataUrl = await createQrCode({ title: "Question", url: "https://example.com/questions/123" });
    expect(dataUrl?.startsWith("data:image/png")).toBe(true);
    expect(prepareShare({ title: "Question", url: "https://example.com/questions/123" }).qrValue).toBe("https://example.com/questions/123");
  });

  it("falls back to text when a QR should not be a URL", () => {
    const prepared = prepareShare({ title: "Question", text: "What is a stop line?", qrValue: "What is a stop line?" });
    expect(prepared.qrValue).toBe("What is a stop line?");
    expect(prepared.url).toBeUndefined();
  });

  it("does not treat localhost as remotely shareable", () => {
    expect(isShareableUrl("http://localhost:3000/en/questions/123")).toBe(false);
    expect(isShareableUrl("http://127.0.0.1/questions/123")).toBe(false);
    const prepared = prepareShare({ title: "Question", text: "Local only", url: "http://localhost:3000/en/questions/123" });
    expect(prepared.remote).toBe(false);
    expect(prepared.url).toBeUndefined();
    expect(prepared.qrValue).toBe("Local only");
  });

  it("downloads a PNG with a sanitized filename", () => {
    let saved: HTMLAnchorElement | null = null;
    const created = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const node = created(tag);
      if (tag === "a") {
        node.click = () => {
          saved = node as HTMLAnchorElement;
        };
      }
      return node;
    });
    downloadQrCode("data:image/png;base64,abc", sanitizeQrFilename("Rails interview questions"));
    expect(saved?.getAttribute("download")).toBe("rails-interview-questions-qr.png");
    expect(saved?.getAttribute("href")).toContain("data:image/png");
    vi.restoreAllMocks();
  });

  it("strips unsafe filename characters", () => {
    expect(sanitizeQrFilename("../../secret feed?")).toBe("secret-feed-qr.png");
  });

  it("shares a bookmark through the bookmark URL", () => {
    const payload = bookmarkSharePayload({ title: "Rails notes", note: "review", url: "https://github.com/rails/rails" });
    expect(payload?.url).toBe("https://github.com/rails/rails");
    expect(payload?.qrValue).toBe("https://github.com/rails/rails");
    expect(prepareShare(payload!).qrValue).toBe(payload?.url);
  });

  it("shares a public question through its permalink", () => {
    const payload = questionSharePayload({
      title: "Driving theory question",
      prompt: "When do you stop?",
      publicUrl: "https://example.com/questions/123",
    });
    expect(payload.url).toBe("https://example.com/questions/123");
    expect(payload.qrValue).toBe(payload.url);
  });

  it("does not invent a public URL for a local question", () => {
    const payload = questionSharePayload({ title: "Question", prompt: "Local prompt", publicUrl: "http://localhost:3000/en/questions/123" });
    expect(payload.url).toBeUndefined();
    expect(payload.qrValue).toBe("Local prompt");
    expect(JSON.stringify(payload)).not.toContain("localhost");
  });

  it("requires an extra confirmation for private content", () => {
    expect(prepareShare({ title: "Sketch", text: "private note", privacy: "private", source: "note" }).privateConfirm).toBe(true);
    expect(prepareShare({ title: "Site", url: "https://example.com", privacy: "external" }).privateConfirm).toBe(false);
  });

  it("refuses a secret calendar feed URL", () => {
    const secret = "https://calendar.google.com/calendar/ical/me/private-abc123/basic.ics";
    const payload = calendarSharePayload({ title: "Standup", when: "09:00–09:30", location: "Room 2", sourceUrl: secret });
    const prepared = prepareShare(payload);
    expect(payload.url).toBeUndefined();
    expect(prepared.qrValue).not.toContain("private-");
    expect(prepared.text).toContain("Room 2");
    expect(isShareableUrl(secret)).toBe(false);
  });

  it("offers QR file sharing only when the browser can share files", () => {
    expect(qrFileSharingSupported(nav({ canShare: vi.fn(() => false) }))).toBe(false);
    expect(qrFileSharingSupported(nav({ canShare: vi.fn(() => true) }))).toBe(true);
    expect(qrFileSharingSupported(nav({ share: undefined, canShare: undefined }))).toBe(false);
  });

  it("still offers copy and QR when native share is missing", () => {
    const prepared = prepareShare({ title: "Page", text: "Hello", url: "https://example.com/page" });
    expect(prepared.canCopyLink).toBe(true);
    expect(prepared.canShowQr).toBe(true);
    expect(prepared.canCopyText).toBe(true);
  });
});

describe("share dialog", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
    vi.unstubAllGlobals();
  });

  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function renderButton(payload: SharePayload) {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn(async () => undefined) });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <ShareButton payload={payload} />
        </NextIntlClientProvider>,
      );
    });
  }

  it("opens and closes the share dialog from the keyboard", async () => {
    await renderButton({ title: "Rails interview questions", url: "https://example.com/questions/123", text: "Review" });
    const button = document.querySelector<HTMLButtonElement>("[aria-label='Share']");
    expect(button).toBeTruthy();
    await act(async () => button?.click());
    await settle();
    const dialog = document.querySelector("[role='dialog']");
    expect(dialog?.textContent).toContain("Share with...");
    expect(dialog?.textContent).toContain("Copy link");
    expect(dialog?.textContent).toContain("QR code");
    dialog?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await act(async () => undefined);
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("keeps keyboard focus inside the dialog", async () => {
    await renderButton({ title: "Page", url: "https://example.com/page", text: "Hello" });
    await act(async () => document.querySelector<HTMLButtonElement>("[aria-label='Share']")?.click());
    const dialog = document.querySelector("[role='dialog']");
    const buttons = [...(dialog?.querySelectorAll("button") ?? [])];
    const last = buttons[buttons.length - 1] as HTMLButtonElement;
    last.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    });
    expect(dialog?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("asks before sharing private content and does not rename the share button", async () => {
    await renderButton({ title: "Private note", text: "Salary numbers", privacy: "private", source: "note" });
    const button = document.querySelector<HTMLButtonElement>("[aria-label='Share']");
    await act(async () => button?.click());
    expect(document.body.textContent).toContain("This contains private Dayline content.");
    expect(document.body.textContent).not.toContain("Copy link");
    await act(async () => {
      [...document.querySelectorAll("button")].find((item) => item.textContent === "Share anyway")?.click();
    });
    expect(document.body.textContent).toContain("Copy text");
    expect(button?.textContent).toContain("Share");
  });

  it("shows Share QR only when file sharing is supported, then closes the QR view", async () => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn(async () => undefined) });
    await renderButton({ title: "Question", url: "https://example.com/questions/123" });
    await act(async () => document.querySelector<HTMLButtonElement>("[aria-label='Share']")?.click());
    await act(async () => {
      [...document.querySelectorAll("button")].find((item) => item.textContent === "QR code")?.click();
    });
    for (let attempt = 0; attempt < 20 && !document.querySelector("img"); attempt += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }
    expect(document.querySelector("img")?.getAttribute("alt")).toContain("Question");
    expect(document.body.textContent).toContain("Share QR");
    await act(async () => {
      [...document.querySelectorAll("button")].find((item) => item.textContent === "Done")?.click();
    });
    expect(document.body.textContent).not.toContain("Share with QR");
  });
});
