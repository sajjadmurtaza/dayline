import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DaylineProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { buildMetadata } from "@/domains/marketing/seo-metadata";
import { htmlLang, localeDirection, parseLocale } from "@/i18n/config";
import { sansFont, scriptFont } from "@/i18n/fonts";
import { routing } from "@/i18n/routing";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata(locale, "");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = parseLocale(raw);
  setRequestLocale(locale);
  const messages = await getMessages();
  const script = await scriptFont(locale);

  return (
    <html
      lang={htmlLang(locale)}
      dir={localeDirection(locale)}
      className={`${sansFont.variable} ${script?.variable ?? ""} h-full bg-paper antialiased`}
    >
      <body className="min-h-full bg-paper font-sans text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DaylineProvider>
            <AppShell>{children}</AppShell>
          </DaylineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
