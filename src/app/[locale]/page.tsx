import { PageSeo } from "@/components/seo/page-seo";
import { TodayView } from "@/components/today-view";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("");

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} />
      <TodayView />
    </>
  );
}
