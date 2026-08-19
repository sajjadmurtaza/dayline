"use client";

import { useLocale, useTranslations } from "next-intl";
import { LANGUAGE_MENU_LOCALES, LOCALE_CONFIG, type SupportedLocale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={`relative inline-flex w-full min-w-0 max-w-full ${className}`}>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => {
          const next = event.target.value as SupportedLocale;
          if (next === locale) return;
          router.replace(pathname, { locale: next });
        }}
        className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-line bg-paper-raised pe-10 ps-4 text-sm font-semibold leading-none text-ink"
      >
        {LANGUAGE_MENU_LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_CONFIG[code].nativeName}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-muted"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M4 6 L8 11 L12 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
