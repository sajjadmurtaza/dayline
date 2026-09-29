export type CalendarUrlKind =
  | { kind: "ics"; url: string; secret: boolean }
  | { kind: "google-page" }
  | { kind: "invalid" };

export function isSecretIcalUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.includes("/private-") || path.includes("/private/");
  } catch {
    return false;
  }
}

export function displayFeedUrl(url: string, secret: boolean): string {
  if (!secret) return url;
  try {
    const file = new URL(url).pathname.split("/").filter(Boolean).pop() || "basic.ics";
    return `••••••••••••/${file}`;
  } catch {
    return "••••••••••••/basic.ics";
  }
}

export function normalizeFeedUrl(raw: string): CalendarUrlKind {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "invalid" };
  let candidate = trimmed;
  if (candidate.toLowerCase().startsWith("webcal://")) {
    candidate = `https://${candidate.slice("webcal://".length)}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { kind: "invalid" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { kind: "invalid" };
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const googleHost = host === "calendar.google.com" || host.endsWith(".calendar.google.com");
  if (googleHost) {
    const feed = path.includes("/ical/") || path.endsWith(".ics");
    if (!feed) return { kind: "google-page" };
    const href = url.toString();
    return { kind: "ics", url: href, secret: isSecretIcalUrl(href) };
  }
  return { kind: "ics", url: url.toString(), secret: false };
}
