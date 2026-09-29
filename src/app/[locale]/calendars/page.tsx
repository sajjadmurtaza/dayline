import { CalendarsView } from "@/components/calendars-view";
import { PageSeo } from "@/components/seo/page-seo";
import { buildMetadata } from "@/domains/marketing/seo-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildMetadata(locale, "calendars");
}

export default async function CalendarsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="calendars" />
      <CalendarsView />
    </>
  );
}
