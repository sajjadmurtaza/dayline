import type { PreparedShare, SharePayload } from "@/domains/share/types";

export function isSecretCredential(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("/private-") ||
    lower.includes("/private/") ||
    lower.includes("access_token=") ||
    lower.includes("refresh_token=") ||
    lower.includes("client_secret") ||
    lower.startsWith("webcal://")
  );
}

export function isShareableUrl(url: string): boolean {
  if (isSecretCredential(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  ) {
    return false;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false;
  return true;
}

export function sanitizeQrFilename(name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${stem || "share"}-qr.png`;
}

function looksLikeAddress(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^[a-z0-9.-]+:\/\//i.test(value) || value.includes("localhost");
}

export function prepareShare(payload: SharePayload): PreparedShare {
  const secret = [payload.url, payload.qrValue].some((value) => value && isSecretCredential(value));
  const remote = Boolean(payload.url && !secret && isShareableUrl(payload.url));
  const url = remote ? payload.url : undefined;
  let qrValue = payload.qrValue ?? url ?? payload.text;
  if (qrValue && (isSecretCredential(qrValue) || (looksLikeAddress(qrValue) && !isShareableUrl(qrValue)))) {
    qrValue = url ?? payload.text;
  }
  if (qrValue && looksLikeAddress(qrValue) && !isShareableUrl(qrValue)) qrValue = payload.text;
  return {
    title: payload.title,
    text: payload.text,
    url,
    qrValue,
    filename: sanitizeQrFilename(payload.filename ?? payload.title),
    remote,
    privateConfirm: payload.privacy === "private",
    canCopyLink: remote,
    canCopyText: Boolean(payload.text),
    canShowQr: Boolean(qrValue),
    rejectedUrl: Boolean(payload.url && !remote),
  };
}

export function bookmarkSharePayload(bookmark: {
  title: string;
  note?: string;
  url: string;
  isLocalFile?: boolean;
}): SharePayload | null {
  if (isSecretCredential(bookmark.url)) return null;
  const url = !bookmark.isLocalFile && isShareableUrl(bookmark.url) ? bookmark.url : undefined;
  return {
    title: bookmark.title,
    text: bookmark.note || undefined,
    url,
    qrValue: url,
    filename: bookmark.title,
    source: "bookmark",
    privacy: "external",
  };
}

export function questionSharePayload(input: { title: string; prompt: string; publicUrl?: string }): SharePayload {
  const url = input.publicUrl && isShareableUrl(input.publicUrl) ? input.publicUrl : undefined;
  return {
    title: input.title,
    text: input.prompt,
    url,
    qrValue: url ?? input.prompt,
    filename: input.title,
    source: "question",
    privacy: url ? "public" : "private",
  };
}

export function calendarSharePayload(event: {
  title: string;
  when: string;
  location?: string | null;
  sourceUrl?: string | null;
}): SharePayload {
  const url = event.sourceUrl && isShareableUrl(event.sourceUrl) ? event.sourceUrl : undefined;
  const text = [event.when, event.location].filter(Boolean).join("\n");
  return {
    title: event.title,
    text,
    url,
    qrValue: url ?? text,
    filename: event.title,
    source: "calendar",
    privacy: "external",
  };
}
