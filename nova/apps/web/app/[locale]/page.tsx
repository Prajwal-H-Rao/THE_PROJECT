/** The home page of the web app. It renders the scaffold surface. */

import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/** Render the home copy from the message file. No string sits in code. */
export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("description")}</p>
      <div>
        <Button>{t("cta")}</Button>
      </div>
    </main>
  );
}
