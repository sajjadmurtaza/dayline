import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/config";
import { FAQS, INDEXABLE_RESTS } from "./seo-copy";
import {
  OG_LOCALE,
  absoluteUrl,
  alternateUrls,
  breadcrumbs,
  indexableRests,
  jsonLd,
  localeFromPath,
  localePath,
  restPath,
  seoFor,
  siteUrl,
  switchLocale,
} from "./seo";

describe("siteUrl", () => {
  it("never uses the unrelated public dayline.vercel.app host", () => {
    expect(siteUrl()).not.toMatch(/dayline\.vercel\.app/i);
  });

  it("prefers NEXT_PUBLIC_SITE_URL and otherwise stays on this origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
      expect(siteUrl()).toBe("https://example.test");
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe("locale helpers", () => {
  it("builds locale paths without a trailing slash on home", () => {
    expect(localePath("en")).toBe("/en");
    expect(localePath("ar", "inbox")).toBe("/ar/inbox");
  });

  it("switches locale while keeping the rest of the path", () => {
    expect(switchLocale("/en/brain-dump", "de")).toBe("/de/brain-dump");
    expect(restPath("/ja/calendar")).toBe("calendar");
    expect(localeFromPath("/ur/notes")).toBe("ur");
    expect(localeFromPath("/unknown")).toBe(DEFAULT_LOCALE);
  });
});

describe("seoFor", () => {
  it("gives each public route a unique English title", () => {
    const titles = INDEXABLE_RESTS.map((rest) => seoFor(localePath("en", rest)).title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(indexableRests()).toEqual([...INDEXABLE_RESTS]);
  });

  it("uses 404 copy for unknown public paths", () => {
    expect(seoFor("/en/not-a-page").title).toMatch(/not found/i);
    expect(seoFor("/en/not-a-page").robots).toBe("noindex, follow");
    expect(seoFor("/en").robots).toBe("index, follow");
  });
});

describe("hreflang and schema", () => {
  it("emits reciprocal alternates for every supported locale", () => {
    const alts = alternateUrls("/de/inbox");
    expect(alts.map((item) => item.hreflang).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    expect(alts.every((item) => item.href.startsWith(siteUrl()))).toBe(true);
    expect(alts.find((item) => item.locale === "en")?.href).toBe(`${siteUrl()}/en/inbox`);
    expect(Object.keys(OG_LOCALE).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    expect(seoFor("/ko").title).toMatch(/오늘/);
    expect(seoFor("/zh").title).toMatch(/今天|看见/);
    expect(seoFor("/ru").title).toMatch(/день|место/i);
    expect(seoFor("/es").title).toMatch(/día|trabajo/i);
  });

  it("adds FAQ schema only on home", () => {
    const home = jsonLd("/en");
    const graph = home["@graph"] as { "@type": string; mainEntity?: unknown[] }[];
    const faq = graph.find((item) => item["@type"] === "FAQPage");
    expect(graph.some((item) => item["@type"] === "Organization")).toBe(true);
    expect(graph.some((item) => item["@type"] === "WebSite")).toBe(true);
    expect(graph.some((item) => item["@type"] === "SoftwareApplication")).toBe(true);
    expect(faq?.mainEntity).toHaveLength(FAQS.en.length);
    const inbox = jsonLd("/en/inbox");
    const inboxGraph = inbox["@graph"] as { "@type": string }[];
    expect(inboxGraph.some((item) => item["@type"] === "FAQPage")).toBe(false);
  });

  it("uses the locale description on WebSite schema", () => {
    const graph = jsonLd("/ar")["@graph"] as { "@type": string; description?: string }[];
    const site = graph.find((item) => item["@type"] === "WebSite");
    expect(site?.description).toBe(seoFor("/ar").description);
    expect(site?.description).not.toBe(seoFor("/en").description);
  });

  it("builds breadcrumbs and absolute urls", () => {
    const crumbs = breadcrumbs("en", "calendar");
    expect(crumbs[0]?.path).toBe("/en");
    expect(crumbs.at(-1)?.path).toBe("/en/calendar");
    expect(breadcrumbs("en", "").length).toBe(1);
    expect(absoluteUrl("og.svg")).toBe(`${siteUrl()}/og.svg`);
    expect(absoluteUrl("/og.svg")).toBe(`${siteUrl()}/og.svg`);
  });
});
