import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { indexableRests, localePath, siteUrl } from "@/domains/marketing/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const updated = new Date("2026-08-19");
  return SUPPORTED_LOCALES.flatMap((locale) =>
    indexableRests().map((rest) => ({
      url: `${origin}${localePath(locale, rest)}`,
      lastModified: updated,
      changeFrequency: rest === "" ? "weekly" : "monthly",
      priority: rest === "" ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries([
          ...SUPPORTED_LOCALES.map((other) => [other, `${origin}${localePath(other, rest)}`]),
          ["x-default", `${origin}${localePath("en", rest)}`],
        ]),
      },
    })),
  );
}
