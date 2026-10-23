/** The proxy of the web app. It runs the next-intl locale router. */

import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

// WHY: the middleware file convention is deprecated in Next.js 16. The proxy
// convention replaces it with the same request contract (see the note in
// docs/design-notes/nova-api-gateway.md).
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
