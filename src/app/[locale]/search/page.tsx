import { SearchView } from "@/components/search-view";
import { PageSeo } from "@/components/seo/page-seo";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("search");

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="search" />
      <SearchView />
    </>
  );
}
