import { BrainDumpView } from "@/components/brain-dump-view";
import { PageSeo } from "@/components/seo/page-seo";
import { generatePageMetadata } from "@/domains/marketing/seo-metadata";

export const generateMetadata = generatePageMetadata("brain-dump");

export default async function BrainDumpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PageSeo locale={locale} rest="brain-dump" />
      <BrainDumpView />
    </>
  );
}
