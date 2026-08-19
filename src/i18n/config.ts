export const SUPPORTED_LOCALES = [
  "en",
  "ar",
  "ur",
  "ja",
  "de",
  "fr",
  "hi",
  "bn",
  "tr",
  "es",
  "id",
  "ko",
  "zh",
  "ru",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export type TextDirection = "ltr" | "rtl";

export type LocaleConfig = {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
};

export const LOCALE_CONFIG: Record<SupportedLocale, LocaleConfig> = {
  en: { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
  ur: { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl" },
  ja: { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  de: { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  fr: { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  bn: { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr" },
  tr: { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr" },
  es: { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  id: { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr" },
  ko: { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  zh: { code: "zh", name: "Mandarin Chinese", nativeName: "中文", direction: "ltr" },
  ru: { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr" },
};

export function htmlLang(locale: SupportedLocale): string {
  return locale === "zh" ? "zh-Hans" : locale;
}

export const RTL_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => LOCALE_CONFIG[locale].direction === "rtl",
);

export const LANGUAGE_MENU_LOCALES: readonly SupportedLocale[] = [
  DEFAULT_LOCALE,
  ...SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE).sort((a, b) =>
    LOCALE_CONFIG[a].name.localeCompare(LOCALE_CONFIG[b].name, "en"),
  ),
];

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return Boolean(value && (SUPPORTED_LOCALES as readonly string[]).includes(value));
}

export function localeDirection(locale: string): TextDirection {
  return isSupportedLocale(locale) ? LOCALE_CONFIG[locale].direction : "ltr";
}

export function parseLocale(value: string | null | undefined): SupportedLocale {
  if (isSupportedLocale(value)) return value;
  if (!value) return DEFAULT_LOCALE;
  const base = value.split("-")[0];
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}
