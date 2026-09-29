"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageTitle } from "@/components/page-title";
import { useDayline } from "@/components/app-provider";

export function MoreView() {
  const t = useTranslations("app.more");
  const calendars = useTranslations("app.calendars");
  const common = useTranslations("common");
  const { resetDemo, undo } = useDayline();
  return (
    <div className="space-y-4">
      <PageTitle>{t("title")}</PageTitle>
      <LanguageSwitcher />
      <div className="flex flex-col gap-1">
        <Link href="/calendars" className="flex min-h-12 items-center px-1 text-sm">
          {calendars("nav")}
        </Link>
        <Link href="/brain-dump" className="flex min-h-12 items-center px-1 text-sm">
          {common("nav.brainDump")}
        </Link>
        <Link href="/search" className="flex min-h-12 items-center px-1 text-sm">
          {common("nav.search")}
        </Link>
        <Link href="/bookmarks" className="flex min-h-12 items-center px-1 text-sm">
          {common("nav.bookmarks")}
        </Link>
        <Link href="/sometime" className="flex min-h-12 items-center px-1 text-sm">
          {common("nav.sometime")}
        </Link>
        <button type="button" className="min-h-12 px-1 text-start text-sm" onClick={undo}>
          {common("actions.undo")}
        </button>
        <button type="button" className="min-h-12 px-1 text-start text-sm" onClick={resetDemo}>
          {common("actions.clearDemo")}
        </button>
      </div>
    </div>
  );
}
