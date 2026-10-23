/** The locale layout of the web app. It provides the messages and the shell. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";

import "../globals.css";

/** The locale layout props. */
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Resolve one raw locale segment or end the request with a 404. */
async function resolveLocale(raw: string | undefined): Promise<Locale> {
  if (raw !== undefined && routing.locales.includes(raw as Locale)) {
    return raw as Locale;
  }
  notFound();
}

/** Build the page metadata of the locale route. */
export async function generateMetadata({
  params,
}: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  const resolved = await resolveLocale(locale);
  const t = await getTranslations({ locale: resolved, namespace: "home" });
  return { title: t("title"), description: t("description") };
}

/** Render the app shell under one locale. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const resolved = await resolveLocale(locale);
  return (
    <html lang={resolved}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
