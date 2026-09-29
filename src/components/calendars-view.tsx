"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useDayline } from "@/components/app-provider";
import { CalendarStaleNotice } from "@/components/calendar-sync";
import { PageTitle } from "@/components/page-title";
import { parseIcs, type IcsPreview, type ParsedCalendarEvent } from "@/domains/calendars/ics";
import { fetchCalendarList, freshToken, loadFeed, loadGoogleBatches } from "@/domains/calendars/remote";
import { displayFeedUrl, normalizeFeedUrl } from "@/domains/calendars/url";

type GoogleHash = { accessToken: string; refreshToken: string | null; expiresAt: number };

export function CalendarsView() {
  const t = useTranslations("app.calendars");
  const locale = useLocale();
  const router = useRouter();
  const app = useDayline();
  const [feedUrl, setFeedUrl] = useState("");
  const [feedError, setFeedError] = useState<"not-ics" | "google-page" | null>(null);
  const [preview, setPreview] = useState<{
    filename: string;
    parsed: IcsPreview;
    feedUrl?: string;
    secret?: boolean;
    replaceId?: string;
  } | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const feedInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const connection = app.doc.googleConnection;
  const minutes = connection?.lastSyncedAt ? Math.max(0, Math.round((app.now.getTime() - connection.lastSyncedAt) / 60000)) : null;

  useEffect(() => {
    const hash = window.location.hash.replace(/^#google=/, "");
    if (!window.location.hash.startsWith("#google=")) return;
    try {
      const token = JSON.parse(atob(hash.replace(/-/g, "+").replace(/_/g, "/"))) as GoogleHash;
      app.saveGoogleConnection({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        email: null,
        selectedCalendarIds: connection?.selectedCalendarIds ?? [],
        calendars: connection?.calendars ?? [],
        lastSyncedAt: connection?.lastSyncedAt ?? null,
        lastError: null,
      });
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // One-time handoff from the OAuth redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#import-file") return;
    fileInput.current?.click();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function loadCalendars() {
    if (!connection) return;
    setBusy(true);
    try {
      const token = await freshToken(connection);
      if (!token) throw new Error("sync");
      const listed = await fetchCalendarList(token);
      app.saveGoogleConnection({ ...app.doc.googleConnection!, accessToken: token, calendars: listed, lastError: null });
    } catch {
      app.noteGoogleFailure(t("syncFail"));
    } finally {
      setBusy(false);
    }
  }

  async function importSelected() {
    if (!connection) return;
    setBusy(true);
    try {
      const batches = await loadGoogleBatches(connection, app.now);
      if (!batches) throw new Error("sync");
      app.importGoogleEvents(batches);
    } catch {
      app.noteGoogleFailure(t("syncFail"));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    const parsed = parseIcs(text, app.now);
    if (!parsed.ok) {
      setFeedError("not-ics");
      setPreview(null);
      return;
    }
    setFeedError(null);
    setPreview({ filename: file.name, parsed });
  }

  async function onFeed() {
    const classified = normalizeFeedUrl(feedUrl);
    if (classified.kind === "invalid") {
      setFeedError("not-ics");
      return;
    }
    if (classified.kind === "google-page") {
      setFeedError("google-page");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/calendars/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: classified.url }),
      });
      const body = (await response.json()) as { text?: string; error?: string; url?: string };
      if (!response.ok || !body.text) {
        setFeedError(body.error === "google-page" ? "google-page" : "not-ics");
        return;
      }
      const parsed = parseIcs(body.text, app.now);
      if (!parsed.ok) {
        setFeedError("not-ics");
        return;
      }
      setFeedError(null);
      setPreview({
        filename: parsed.name,
        parsed,
        feedUrl: body.url ?? classified.url,
        secret: classified.secret,
        replaceId: replacing ?? undefined,
      });
      setReplacing(null);
      setFeedUrl("");
    } finally {
      setBusy(false);
    }
  }

  const needsConfig = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("google") === "needs-config";

  return (
    <div className="space-y-5">
      <PageTitle>{t("title")}</PageTitle>
      <p className="text-[15px]">{t("lead")}</p>
      <p className="text-sm text-muted">{t("sources")}</p>
      <p className="text-sm text-muted">{t("privacy")}</p>
      {needsConfig ? <p className="text-sm">{t("needsConfig")}</p> : null}
      <CalendarStaleNotice />
      {minutes != null ? <p className="type-caption">{minutes < 1 ? t("updatedNow") : t("updatedAgo", { minutes })}</p> : null}

      <section className="space-y-2 rounded-[1.05rem] bg-paper-raised p-4">
        <h2 className="type-title">{t("google")}</h2>
        <p className="type-caption">{t("googleLive")}</p>
        {connection ? (
          <>
            <p className="type-caption">{t("connected")}</p>
            <p className="type-caption">{t("selected", { count: connection.selectedCalendarIds.length })}</p>
            <ul className="space-y-1">
              {connection.calendars.map((calendar) => (
                <li key={calendar.id}>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={connection.selectedCalendarIds.includes(calendar.id)}
                      onChange={(event) => {
                        const ids = event.target.checked
                          ? [...connection.selectedCalendarIds, calendar.id]
                          : connection.selectedCalendarIds.filter((id) => id !== calendar.id);
                        app.chooseGoogleCalendars(ids);
                      }}
                    />
                    {calendar.name}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="pill pill-muted" onClick={() => void loadCalendars()} disabled={busy}>
                {t("manage")}
              </button>
              <button type="button" className="pill pill-now" onClick={() => void importSelected()} disabled={busy}>
                {t("importSelected")}
              </button>
              <button type="button" className="pill pill-muted" onClick={app.disconnectCalendar}>
                {t("disconnect")}
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="pill pill-now" onClick={() => router.push(`/api/calendars/google/start?locale=${locale}`)}>
            {t("connectGoogle")}
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="type-title">{t("importedFile")}</h2>
        <p className="type-caption">{t("fileSnapshot")}</p>
        {app.doc.calendarFiles.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {file.filename}
              <span className="text-muted"> · {t("eventsCount", { count: file.eventCount })}</span>
            </span>
            <button type="button" className="pill pill-muted" onClick={() => app.removeFile(file.id)}>
              {t("remove")}
            </button>
          </div>
        ))}
        <label className="pill pill-muted inline-flex min-h-11 cursor-pointer items-center px-4">
          {t("importIcs")}
          <input
            ref={fileInput}
            type="file"
            accept=".ics,text/calendar"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="type-title">{t("calendarFeed")}</h2>
        <p className="type-caption">{t("feedLive")}</p>
        {app.doc.calendarFeeds.map((feed) => (
          <div key={feed.id} className="space-y-1 text-sm">
            <p>{feed.name}</p>
            <p className="text-muted">{displayFeedUrl(feed.url, feed.secret)}</p>
            {feed.lastSyncedAt != null ? (
              <p className="type-caption">
                {minutesAgo(feed.lastSyncedAt, app.now) < 1
                  ? t("updatedNow")
                  : t("updatedAgo", { minutes: minutesAgo(feed.lastSyncedAt, app.now) })}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="button" className="pill pill-muted" onClick={() => void refreshFeed(feed)}>
                {t("refresh")}
              </button>
              <button
                type="button"
                className="pill pill-muted"
                onClick={() => {
                  setReplacing(feed.id);
                  feedInput.current?.focus();
                }}
              >
                {t("replaceLink")}
              </button>
              <button type="button" className="pill pill-muted" onClick={() => app.removeFeed(feed.id)}>
                {t("remove")}
              </button>
            </div>
          </div>
        ))}
        <input
          ref={feedInput}
          value={feedUrl}
          onChange={(event) => setFeedUrl(event.target.value)}
          placeholder={t("feedPlaceholder")}
          className="min-h-12 w-full rounded-full px-4 ring-1 ring-line"
        />
        <button type="button" className="pill pill-now" onClick={() => void onFeed()} disabled={busy}>
          {t("addFeed")}
        </button>
      </section>

      {feedError === "not-ics" ? (
        <div className="space-y-2">
          <p>{t("notIcs")}</p>
          <button type="button" className="pill pill-muted" onClick={() => setFeedError(null)}>
            {t("tryAnother")}
          </button>
          <button type="button" className="pill pill-now" onClick={() => router.push(`/api/calendars/google/start?locale=${locale}`)}>
            {t("connectGoogle")}
          </button>
        </div>
      ) : null}
      {feedError === "google-page" ? (
        <div className="space-y-2">
          <p>{t("googlePage")}</p>
          <p className="text-sm text-muted">{t("googlePageHelp")}</p>
          <p className="text-sm">{t("googlePageSteps")}</p>
          <button
            type="button"
            className="pill pill-now"
            onClick={() => {
              setFeedError(null);
              feedInput.current?.focus();
            }}
          >
            {t("pasteIcal")}
          </button>
        </div>
      ) : null}

      {preview?.parsed.ok ? (
        <section className="space-y-2 rounded-[1.05rem] bg-paper-raised p-4">
          <h2 className="type-title">{t("previewTitle")}</h2>
          <p>{preview.parsed.name}</p>
          {preview.feedUrl && isGoogleFeed(preview.feedUrl) ? <p>{t("google")}</p> : null}
          <p>{preview.feedUrl ? t("meetings", { count: preview.parsed.timed }) : t("timed", { count: preview.parsed.timed })}</p>
          <p>{preview.feedUrl ? t("allDayItems", { count: preview.parsed.allDay }) : t("allDay", { count: preview.parsed.allDay })}</p>
          {preview.feedUrl ? null : <p>{t("cancelledCount", { count: preview.parsed.cancelled })}</p>}
          <p className="type-caption">{t("range")}</p>
          <p className="type-caption">{preview.feedUrl ? t("previewFeed") : t("previewSnapshot")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="pill pill-now"
              onClick={() => {
                if (preview.feedUrl) app.importFeed(preview.feedUrl, preview.parsed.name, preview.parsed.events, preview.replaceId, preview.secret);
                else app.importIcsFile(preview.filename, preview.parsed.name, preview.parsed.events);
                setPreview(null);
              }}
            >
              {preview.feedUrl ? t("importCalendar") : t("import")}
            </button>
            <button type="button" className="pill pill-muted" onClick={() => setPreview(null)}>
              {t("cancel")}
            </button>
          </div>
        </section>
      ) : null}
      {connection || app.doc.calendarFeeds.length > 0 ? (
        <div className="space-y-2">
          <button type="button" className="pill pill-muted" onClick={() => void refreshAll()} disabled={busy}>
            {t("refreshAll")}
          </button>
          <p className="type-caption">{t("refreshScope")}</p>
        </div>
      ) : null}
    </div>
  );

  async function refreshAll() {
    setBusy(true);
    try {
      const google = connection ? await loadGoogleBatches(connection, app.now).catch(() => null) : null;
      const feeds: {
        id: string;
        url: string;
        name: string;
        secret: boolean;
        events: ParsedCalendarEvent[] | null;
        error: string | null;
      }[] = [];
      for (const feed of app.doc.calendarFeeds) {
        const loaded = await loadFeed(feed.url, app.now);
        feeds.push({
          id: feed.id,
          url: feed.url,
          name: feed.name,
          secret: feed.secret,
          events: loaded,
          error: loaded ? null : t("stale"),
        });
      }
      app.syncExternalCalendars({
        google: connection ? (google ? { batches: google, error: null } : { batches: [], error: t("stale") }) : null,
        feeds,
      });
    } finally {
      setBusy(false);
    }
  }

  async function refreshFeed(feed: { id: string; url: string; name: string; secret: boolean }) {
    const loaded = await loadFeed(feed.url, app.now);
    app.syncExternalCalendars({
      google: null,
      feeds: [
        {
          id: feed.id,
          url: feed.url,
          name: feed.name,
          secret: feed.secret,
          events: loaded,
          error: loaded ? null : t("stale"),
        },
      ],
    });
  }
}

function isGoogleFeed(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().endsWith("calendar.google.com");
  } catch {
    return false;
  }
}

function minutesAgo(at: number | null, now: Date) {
  if (at == null) return 0;
  return Math.max(0, Math.round((now.getTime() - at) / 60000));
}
