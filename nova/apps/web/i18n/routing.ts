/** The locale routing table of the web app. */

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
});

/** The locale element type, so call sites can validate without any. */
export type Locale = (typeof routing.locales)[number];
