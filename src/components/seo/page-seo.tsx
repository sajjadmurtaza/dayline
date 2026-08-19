import { SeoJsonLd } from "@/components/seo/json-ld";
import { localePath } from "@/domains/marketing/seo";
import { parseLocale } from "@/i18n/config";

export function PageSeo({ locale, rest = "" }: { locale: string; rest?: string }) {
  return <SeoJsonLd pathname={localePath(parseLocale(locale), rest)} />;
}
