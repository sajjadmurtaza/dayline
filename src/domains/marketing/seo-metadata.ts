import type { Metadata } from "next";
import { DEFAULT_LOCALE, parseLocale } from "@/i18n/config";
import {
  OG_LOCALE,
  absoluteUrl,
  alternateUrls,
  localeFromPath,
  localePath,
  restPath,
  seoFor,
  siteUrl,
} from "./seo";

export function buildMetadata(locale: string, rest: string): Metadata {
  const lang = parseLocale(locale);
  const pathname = localePath(lang, rest);
  const seo = seoFor(pathname);
  const alts = alternateUrls(pathname);
  const url = absoluteUrl(pathname);
  const languages: Record<string, string> = {
    "x-default": absoluteUrl(localePath(DEFAULT_LOCALE, rest)),
  };
  for (const alt of alts) languages[alt.hreflang] = alt.href;
  const verify = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

  return {
    metadataBase: new URL(siteUrl()),
    title: seo.title,
    description: seo.description,
    robots: seo.robots,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      siteName: "Dayline",
      title: seo.title,
      description: seo.description,
      url,
      locale: OG_LOCALE[seo.lang],
      alternateLocale: alts
        .filter((alt) => alt.locale !== seo.lang)
        .map((alt) => OG_LOCALE[alt.locale]),
      images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Dayline" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og.svg"],
    },
    icons: { icon: "/favicon.svg" },
    verification: verify ? { google: verify } : undefined,
  };
}

export function metadataFor(pathname: string): Metadata {
  return buildMetadata(localeFromPath(pathname), restPath(pathname));
}

export function generatePageMetadata(rest: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    return buildMetadata(locale, rest);
  };
}
