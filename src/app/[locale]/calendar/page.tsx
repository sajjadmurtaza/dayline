import { CalendarView } from "@/components/calendar-view";
import { PageSeo } from "@/components/seo/page-seo";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("calendar");

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="calendar" />
      <CalendarView />
    </>
  );
}
