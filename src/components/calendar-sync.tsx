"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDayline } from "@/components/app-provider";
import { loadFeed, loadGoogleBatches } from "@/domains/calendars/remote";

export function CalendarSync() {
  const app = useDayline();
  const once = useRef(false);

  useEffect(() => {
    if (!app.hydrated || once.current) return;
    once.current = true;
    if (app.doc.calendarFeeds.length === 0 && !app.doc.googleConnection) return;
    void refreshSaved(app.doc, app.now, app.syncExternalCalendars, "Calendar couldn't update.");
  }, [app]);

  return null;
}

export function CalendarStaleNotice() {
  const t = useTranslations("app.calendars");
  const app = useDayline();
  const stale = Boolean(app.doc.googleConnection?.lastError) || app.doc.calendarFeeds.some((feed) => feed.lastError);
  if (!stale) return null;
  return (
    <div className="space-y-2">
      <p>{t("stale")}</p>
      <button
        type="button"
        className="pill pill-now"
        onClick={() => void refreshSaved(app.doc, app.now, app.syncExternalCalendars, t("stale"))}
      >
        {t("refresh")}
      </button>
    </div>
  );
}

async function refreshSaved(
  doc: ReturnType<typeof useDayline>["doc"],
  now: Date,
  sync: ReturnType<typeof useDayline>["syncExternalCalendars"],
  stale: string,
) {
  const google = doc.googleConnection ? await loadGoogleBatches(doc.googleConnection, now) : null;
  const feeds = [];
  for (const feed of doc.calendarFeeds) {
    const loaded = await loadFeed(feed.url, now);
    feeds.push({
      id: feed.id,
      url: feed.url,
      name: feed.name,
      secret: feed.secret,
      events: loaded,
      error: loaded ? null : stale,
    });
  }
  sync({
    google: doc.googleConnection ? (google ? { batches: google, error: null } : { batches: [], error: stale }) : null,
    feeds,
  });
}
