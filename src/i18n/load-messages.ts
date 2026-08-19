import type { SupportedLocale } from "./config";

export const MESSAGE_NAMESPACES = ["common", "app"] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];

export type AppMessages = Record<MessageNamespace, Record<string, unknown>>;

const catalog: Record<
  SupportedLocale,
  {
    common: () => Promise<{ default: Record<string, unknown> }>;
    app: () => Promise<{ default: Record<string, unknown> }>;
  }
> = {
  en: {
    common: () => import("./locales/en/common.json"),
    app: () => import("./locales/en/app.json"),
  },
  ar: {
    common: () => import("./locales/ar/common.json"),
    app: () => import("./locales/ar/app.json"),
  },
  ur: {
    common: () => import("./locales/ur/common.json"),
    app: () => import("./locales/ur/app.json"),
  },
  ja: {
    common: () => import("./locales/ja/common.json"),
    app: () => import("./locales/ja/app.json"),
  },
  de: {
    common: () => import("./locales/de/common.json"),
    app: () => import("./locales/de/app.json"),
  },
  fr: {
    common: () => import("./locales/fr/common.json"),
    app: () => import("./locales/fr/app.json"),
  },
  hi: {
    common: () => import("./locales/hi/common.json"),
    app: () => import("./locales/hi/app.json"),
  },
  bn: {
    common: () => import("./locales/bn/common.json"),
    app: () => import("./locales/bn/app.json"),
  },
  tr: {
    common: () => import("./locales/tr/common.json"),
    app: () => import("./locales/tr/app.json"),
  },
  es: {
    common: () => import("./locales/es/common.json"),
    app: () => import("./locales/es/app.json"),
  },
  id: {
    common: () => import("./locales/id/common.json"),
    app: () => import("./locales/id/app.json"),
  },
  ko: {
    common: () => import("./locales/ko/common.json"),
    app: () => import("./locales/ko/app.json"),
  },
  zh: {
    common: () => import("./locales/zh/common.json"),
    app: () => import("./locales/zh/app.json"),
  },
  ru: {
    common: () => import("./locales/ru/common.json"),
    app: () => import("./locales/ru/app.json"),
  },
};

export async function loadMessages(locale: SupportedLocale): Promise<AppMessages> {
  const [common, app] = await Promise.all([catalog[locale].common(), catalog[locale].app()]);
  return { common: common.default, app: app.default };
}
