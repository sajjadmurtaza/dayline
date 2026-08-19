import { jsonLd } from "@/domains/marketing/seo";

export function SeoJsonLd({ pathname }: { pathname: string }) {
  return (
    <script
      id="seo-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd(pathname)),
      }}
    />
  );
}
