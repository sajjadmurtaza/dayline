"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ActiveTask } from "@/components/active-task";
import { DaylineIcon, type DaylineIconName } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { QuickCapture } from "@/components/quick-capture";
import { useDayline, useTodayModel } from "@/components/app-provider";
import { CalendarSync } from "@/components/calendar-sync";

const PRIMARY: { href: "/" | "/inbox" | "/calendar" | "/upcoming"; key: DaylineIconName }[] = [
  { href: "/", key: "today" },
  { href: "/inbox", key: "inbox" },
  { href: "/calendar", key: "calendar" },
  { href: "/upcoming", key: "upcoming" },
];

const SECONDARY: {
  href: "/calendars" | "/projects" | "/notes" | "/sometime" | "/brain-dump" | "/search" | "/bookmarks";
  key: DaylineIconName;
}[] = [
  { href: "/calendars", key: "calendar" },
  { href: "/projects", key: "projects" },
  { href: "/notes", key: "notes" },
  { href: "/sometime", key: "sometime" },
  { href: "/brain-dump", key: "brainDump" },
  { href: "/search", key: "search" },
  { href: "/bookmarks", key: "bookmarks" },
];

const LINKS = [...PRIMARY, ...SECONDARY];

const MOBILE: { href: "/" | "/inbox" | "/calendar" | "/more"; key: DaylineIconName }[] = [
  { href: "/", key: "today" },
  { href: "/inbox", key: "inbox" },
  { href: "/calendar", key: "calendar" },
  { href: "/more", key: "more" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const calendars = useTranslations("app.calendars");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const { pause, complete } = useDayline();
  const { running, elapsed } = useTodayModel();
  const isToday = pathname === "/" || pathname === "";

  function active(href: string) {
    return pathname === href || (href === "/" && pathname === "");
  }

  function navLabel(link: { href: string; key: DaylineIconName }) {
    return link.href === "/calendars" ? calendars("nav") : t(`nav.${link.key}`);
  }

  return (
    <div className="min-h-dvh">
      <CalendarSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-paper focus:p-3"
      >
        {t("a11y.skipToContent")}
      </a>
      <div className="flex min-h-dvh w-full">
        <div className="relative z-30 hidden h-dvh w-[4.25rem] shrink-0 lg:block">
          <aside className="group/nav absolute inset-y-0 start-0 flex h-dvh w-[4.25rem] flex-col border-e border-line bg-nav py-5 transition-[width,box-shadow] duration-200 ease-out hover:w-52 hover:shadow-[12px_0_32px_rgba(42,38,34,0.06)] focus-within:w-52">
            <p className="flex h-11 items-center gap-2 overflow-hidden px-3 text-sm font-semibold tracking-tight">
              <span className="ms-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-companion" />
              <span className="max-w-0 overflow-hidden opacity-0 transition-all group-hover/nav:max-w-[8rem] group-hover/nav:opacity-100 group-focus-within/nav:max-w-[8rem] group-focus-within/nav:opacity-100">
                {t("appName")}
              </span>
            </p>
            <nav className="mt-6 flex flex-col gap-0.5 px-2" aria-label={t("appName")}>
              {PRIMARY.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  title={navLabel(link)}
                  className={`flex min-h-11 items-center overflow-hidden rounded-xl px-3 text-sm ${
                    active(link.href) ? "bg-ink/8 text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  <DaylineIcon name={link.key} className="h-4 w-4 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover/nav:ms-3 group-hover/nav:max-w-[9rem] group-hover/nav:opacity-100 group-focus-within/nav:ms-3 group-focus-within/nav:max-w-[9rem] group-focus-within/nav:opacity-100">
                    {navLabel(link)}
                  </span>
                </Link>
              ))}
              <button
                type="button"
                className="mt-3 flex min-h-11 items-center overflow-hidden rounded-xl px-3 text-sm text-muted hover:text-ink"
                aria-expanded={more}
                onClick={() => setMore((value) => !value)}
              >
                <DaylineIcon name="more" className="h-4 w-4 shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover/nav:ms-3 group-hover/nav:max-w-[9rem] group-hover/nav:opacity-100 group-focus-within/nav:ms-3 group-focus-within/nav:max-w-[9rem] group-focus-within/nav:opacity-100">
                  {t("nav.more")}
                </span>
              </button>
              {more
                ? SECONDARY.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={navLabel(link)}
                      className={`flex min-h-11 items-center overflow-hidden rounded-xl px-3 text-sm ${
                        active(link.href) ? "bg-ink/8 text-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      <DaylineIcon name={link.key} className="h-4 w-4 shrink-0" />
                      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover/nav:ms-3 group-hover/nav:max-w-[9rem] group-hover/nav:opacity-100 group-focus-within/nav:ms-3 group-focus-within/nav:max-w-[9rem] group-focus-within/nav:opacity-100">
                        {navLabel(link)}
                      </span>
                    </Link>
                  ))
                : null}
            </nav>
            <div className="mx-2 mt-auto flex flex-col gap-2">
              <div className="max-h-0 overflow-hidden opacity-0 transition-all group-hover/nav:max-h-14 group-hover/nav:opacity-100 group-focus-within/nav:max-h-14 group-focus-within/nav:opacity-100">
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                className="flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-now px-3 text-sm text-white"
                onClick={() => setCaptureOpen(true)}
              >
                <DaylineIcon name="add" className="h-4 w-4 shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover/nav:max-w-[5rem] group-hover/nav:opacity-100 group-focus-within/nav:max-w-[5rem] group-focus-within/nav:opacity-100">
                  {t("nav.add")}
                </span>
              </button>
            </div>
          </aside>
        </div>
        <div className="min-w-0 flex-1 px-4 pb-28 pt-4 lg:px-10 lg:pb-16 lg:pt-10">
          <header className="mb-4 flex items-center justify-between lg:hidden">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-companion" aria-hidden />
              {t("appName")}
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 px-2"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <DaylineIcon name="menu" className="h-5 w-5" />
              <span className="sr-only">{open ? t("a11y.closeNav") : t("a11y.openNav")}</span>
            </button>
          </header>
          {open ? (
            <nav className="mb-4 grid grid-cols-2 gap-1 lg:hidden">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center gap-2 px-2 text-sm"
                  onClick={() => setOpen(false)}
                >
                  <DaylineIcon name={link.key} className="h-4 w-4" />
                  {navLabel(link)}
                </Link>
              ))}
              <div className="col-span-2 mt-2">
                <LanguageSwitcher />
              </div>
            </nav>
          ) : null}
          {running && !isToday ? (
            <div className="mx-auto mb-3 w-full max-w-[1320px]">
              <ActiveTask
                task={running}
                elapsed={elapsed(running.id)}
                compact
                onPause={() => pause(running.id)}
                onComplete={() => complete(running.id)}
              />
            </div>
          ) : null}
          <main id="main" className="mx-auto w-full max-w-[1320px]">
            {children}
          </main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-paper px-2 py-1.5 lg:hidden">
        {MOBILE.slice(0, 2).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active(link.href) ? "text-ink" : "text-muted"
            }`}
          >
            <DaylineIcon name={link.key} className="h-5 w-5" />
            {t(`nav.${link.key}`)}
          </Link>
        ))}
        <button
          type="button"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-now text-white"
          onClick={() => setCaptureOpen(true)}
          aria-label={t("nav.add")}
        >
          <DaylineIcon name="add" className="h-5 w-5" />
        </button>
        {MOBILE.slice(2).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active(link.href) ? "text-ink" : "text-muted"
            }`}
          >
            <DaylineIcon name={link.key} className="h-5 w-5" />
            {t(`nav.${link.key}`)}
          </Link>
        ))}
      </nav>
      {captureOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/25 p-4 lg:items-center lg:justify-center"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg rounded-[1.6rem] bg-paper-raised p-5">
            <QuickCapture autoFocus />
            <button
              type="button"
              className="mt-4 min-h-11 type-button text-muted"
              onClick={() => setCaptureOpen(false)}
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
