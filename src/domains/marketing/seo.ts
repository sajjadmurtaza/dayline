import {
  SUPPORTED_LOCALES,
  htmlLang,
  isSupportedLocale,
  parseLocale,
  type SupportedLocale,
} from "@/i18n/config";
import {
  FAQS,
  HOME_COPY,
  INDEXABLE_RESTS,
  NOT_FOUND_COPY,
  PAGE_COPY,
  type IndexableRest,
  type SeoCopy,
} from "./seo-copy";

export { FAQS } from "./seo-copy";

export const OG_LOCALE: Record<SupportedLocale, string> = {
  en: "en_US",
  ar: "ar_AR",
  ur: "ur_PK",
  ja: "ja_JP",
  de: "de_DE",
  fr: "fr_FR",
  hi: "hi_IN",
  bn: "bn_BD",
  tr: "tr_TR",
  es: "es_ES",
  id: "id_ID",
  ko: "ko_KR",
  zh: "zh_CN",
  ru: "ru_RU",
};

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (host) return `https://${host.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function isIndexableRest(rest: string): rest is IndexableRest {
  return (INDEXABLE_RESTS as readonly string[]).includes(rest);
}

export function indexableRests(): string[] {
  return [...INDEXABLE_RESTS];
}

export function localePath(locale: SupportedLocale, rest = ""): string {
  const clean = rest.replace(/^\/+|\/+$/g, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

export function restPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && isSupportedLocale(parts[0])) return parts.slice(1).join("/");
  return parts.join("/");
}

export function localeFromPath(pathname: string): SupportedLocale {
  const first = pathname.split("/").filter(Boolean)[0];
  return parseLocale(first);
}

export function switchLocale(pathname: string, locale: SupportedLocale): string {
  return localePath(locale, restPath(pathname));
}

export function absoluteUrl(path: string): string {
  const origin = siteUrl();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function seoFor(pathname: string): SeoCopy & {
  robots: string;
  rest: string;
  lang: SupportedLocale;
} {
  const lang = localeFromPath(pathname);
  const rest = restPath(pathname);
  let copy = HOME_COPY[lang];
  if (rest && isIndexableRest(rest) && rest !== "") copy = PAGE_COPY[rest][lang];
  else if (rest) copy = NOT_FOUND_COPY[lang];

  return {
    ...copy,
    robots: rest && !isIndexableRest(rest) ? "noindex, follow" : "index, follow",
    rest,
    lang,
  };
}

export function alternateUrls(pathname: string): {
  locale: SupportedLocale;
  href: string;
  hreflang: string;
}[] {
  const rest = restPath(pathname);
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    hreflang: locale,
    href: absoluteUrl(localePath(locale, rest)),
  }));
}

export function breadcrumbs(
  locale: SupportedLocale,
  rest: string,
): { name: string; path: string }[] {
  const crumbs = [{ name: "Dayline", path: localePath(locale) }];
  if (!rest) return crumbs;
  const copy =
    isIndexableRest(rest) && rest !== "" ? PAGE_COPY[rest][locale] : NOT_FOUND_COPY[locale];
  crumbs.push({
    name: copy.title.split(" | ")[0] ?? rest,
    path: localePath(locale, rest),
  });
  return crumbs;
}

export function jsonLd(pathname: string): Record<string, unknown> {
  const seo = seoFor(pathname);
  const url = absoluteUrl(pathname.startsWith("/") ? pathname : localePath(seo.lang, seo.rest));
  const crumbs = breadcrumbs(seo.lang, seo.rest);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      name: "Dayline",
      url: siteUrl(),
      logo: absoluteUrl("/og.svg"),
    },
    {
      "@type": "WebSite",
      name: "Dayline",
      url: siteUrl(),
      inLanguage: [...SUPPORTED_LOCALES],
      description: HOME_COPY[seo.lang].description,
      publisher: { "@type": "Organization", name: "Dayline", url: siteUrl() },
    },
    {
      "@type": "WebPage",
      name: seo.title,
      description: seo.description,
      url,
      inLanguage: htmlLang(seo.lang),
      isPartOf: { "@type": "WebSite", url: siteUrl() },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })),
    },
  ];
  if (!seo.rest) {
    graph.push({
      "@type": "SoftwareApplication",
      name: "Dayline",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      inLanguage: [...SUPPORTED_LOCALES],
      description: seo.description,
      url,
    });
    graph.push({
      "@type": "FAQPage",
      mainEntity: FAQS[seo.lang].map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
