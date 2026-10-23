/** The per-request message catalog of the web app. */

import { getRequestConfig } from "next-intl/server";

import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // WHY: the cast stays narrow. routing.locales is a literal tuple, so the
  // includes check needs the element type to compile.
  const locale =
    requested !== undefined && routing.locales.includes(requested as Locale)
      ? requested
      : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
