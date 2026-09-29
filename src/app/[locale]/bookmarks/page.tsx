import { BookmarksView } from "@/components/bookmarks-view";
import { PageSeo } from "@/components/seo/page-seo";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("bookmarks");

export default async function BookmarksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="bookmarks" />
      <BookmarksView />
    </>
  );
}
