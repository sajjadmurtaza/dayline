"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useDayline } from "@/components/app-provider";
import { DaylineIcon } from "@/components/icons";
import { ShareButton } from "@/components/share/ShareButton";
import { calendarSharePayload } from "@/domains/share/shareUrl";
import { loadFeed, loadGoogleBatches } from "@/domains/calendars/remote";
import { isExternallyManagedEvent } from "@/domains/planning/time-kinds";
import { formatClockRange } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/types";

export function ReadOnlyEvent({ event, children }: { event: CalendarEvent; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("app.today");
  if (!isExternallyManagedEvent(event)) return children;
  return (
    <div className="group relative">
      {children}
      <button type="button" className="absolute inset-0" aria-label={t("readOnly")} onClick={() => setOpen(true)}>
        <span className="absolute end-3 top-3 text-muted opacity-0 transition-opacity group-hover:opacity-100">
          <DaylineIcon name="lock" className="h-3.5 w-3.5" />
        </span>
      </button>
      {open ? <ExternalEventDetail event={event} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

export function ExternalEventDetail({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("app.today");
  const calendars = useTranslations("app.calendars");
  const app = useDayline();
  const source = event.source;
  const feed = source.kind === "calendar-feed" ? app.doc.calendarFeeds.find((item) => item.id === source.feedId) : null;
  const file = source.kind === "calendar-import" ? app.doc.calendarFiles.find((item) => item.id === source.importId) : null;
  const sourceName =
    source.kind === "connector"
      ? event.calendarName || t("googleCalendar")
      : file?.name || feed?.name || event.calendarName || "";
  const openUrl = safeHttps(event.sourceUrl);
  const explain =
    source.kind === "calendar-import" ? t("icsExplain") : source.kind === "calendar-feed" ? t("feedExplain") : t("externalExplain");

  async function refreshGoogle() {
    const connection = app.doc.googleConnection;
    if (!connection) return;
    const batches = await loadGoogleBatches(connection, app.now);
    if (!batches) {
      app.noteGoogleFailure(calendars("stale"));
      return;
    }
    app.importGoogleEvents(batches);
  }

  async function refreshThisFeed() {
    if (!feed) return;
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
          error: loaded ? null : calendars("stale"),
        },
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/10 p-4 sm:items-center" onClick={onClose}>
      <section
        className="w-full max-w-md space-y-3 rounded-[1.05rem] bg-paper p-5 shadow-[var(--shadow-now)]"
        onClick={(click) => click.stopPropagation()}
      >
        <p className="type-time">{formatClockRange(new Date(event.start), new Date(event.end), locale)}</p>
        <h2 className="type-title flex items-center gap-2">
          <DaylineIcon name="calendar" className="h-4 w-4" />
          {event.title}
        </h2>
        {sourceName ? <p>{sourceName}</p> : null}
        <p className="type-caption flex items-center gap-1.5">
          <DaylineIcon name="lock" className="h-3.5 w-3.5" />
          {source.kind === "calendar-import" ? t("readOnlyImport") : t("readOnly")}
        </p>
        {event.location ? (
          <p className="text-sm">
            <span className="type-caption">{t("locationLabel")}</span>
            <span className="mt-0.5 block">{event.location}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted">{explain}</p>
        <div className="flex flex-wrap gap-2">
          <ShareButton
            className="pill pill-muted"
            payload={calendarSharePayload({
              title: event.title,
              when: formatClockRange(new Date(event.start), new Date(event.end), locale),
              location: event.location,
              sourceUrl: openUrl,
            })}
          />
          {source.kind === "connector" && openUrl ? (
            <a className="pill pill-now" href={openUrl} target="_blank" rel="noreferrer">
              {t("openGoogle")}
            </a>
          ) : null}
          {source.kind === "connector" ? (
            <button type="button" className="pill pill-muted" onClick={() => void refreshGoogle()}>
              {t("refreshCalendar")}
            </button>
          ) : null}
          {source.kind === "calendar-feed" ? (
            <button type="button" className="pill pill-muted" onClick={() => void refreshThisFeed()}>
              {t("refreshFeed")}
            </button>
          ) : null}
          {source.kind === "calendar-import" ? (
            <>
              <button type="button" className="pill pill-now" onClick={() => router.push(`/${locale}/calendars#import-file`)}>
                {t("importUpdated")}
              </button>
              {file ? (
                <button
                  type="button"
                  className="pill pill-muted"
                  onClick={() => {
                    app.removeFile(file.id);
                    onClose();
                  }}
                >
                  {t("removeImported")}
                </button>
              ) : null}
            </>
          ) : null}
          {source.kind === "calendar-feed" && feed ? (
            <button
              type="button"
              className="pill pill-muted"
              onClick={() => {
                app.removeFeed(feed.id);
                onClose();
              }}
            >
              {calendars("remove")}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function safeHttps(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.pathname.toLowerCase().includes("/private-")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
