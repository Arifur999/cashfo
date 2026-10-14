import RouteLoading from "@/components/shared/RouteLoading";
import { getTranslator } from "@/lib/i18n/locale";

// Every customer page renders on the server; this shows while it does, so a
// click is answered at once instead of the old page sitting there. A Server
// Component, so it reads the language cookie itself.
export default async function CustomerLoading() {
  const { t } = await getTranslator();
  return <RouteLoading label={t("Loading...")} />;
}
