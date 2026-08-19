import { UpcomingView } from "@/components/upcoming-view";
import { PageSeo } from "@/components/seo/page-seo";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("upcoming");

export default async function UpcomingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="upcoming" />
      <UpcomingView />
    </>
  );
}
